import json
import re
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from app.advisor.fingerprint import format_fingerprint_for_prompt
from app.advisor.models import ChatMessage, ChatSession
from app.core.config import get_settings
from app.rag.retriever import rag_retriever
from app.ocr_engine.demo_resolution import normalize_engine_slug
from app.registry.service import registry_service

settings = get_settings()

SYSTEM_PROMPT = """You are the Unified OCR Platform AI Advisor. Your job is to help users find the right OCR tier through natural, contextual conversation.

CORE PRINCIPLES:
- Be DYNAMIC: Ask questions based on what's uncertain, not a fixed script
- Be EFFICIENT: Don't ask what you already know from conversation
- Be CONVERSATIONAL: Keep replies SHORT (2-3 sentences max), ask ONE question at a time
- TRUST the user: Their description is your primary source of truth
- ASK UNTIL CLEAR: Continue questioning until you have enough information to make a confident recommendation

DISCOVERY APPROACH:
1. Listen carefully to what the user has already told you
2. Identify gaps in your understanding
3. Ask contextual follow-up questions about what's missing or ambiguous
4. Build a complete picture through natural conversation

CRITICAL INFORMATION TO GATHER (ask about what's missing):
- **Document types**: What kinds of documents? (invoices, forms, research papers, handwriting, etc.)
- **Special features**: Tables, equations, handwriting, multi-language, diagrams?
- **Processing volume**: Monthly page count or document count
- **Accuracy requirements**: How critical is accuracy? Structured data extraction needed?
- **Use case context**: Batch processing? Real-time API? Specific workflow needs?
- **Constraints**: Budget sensitivity, latency requirements, integration needs

WHEN TO RECOMMEND:
Only provide a recommendation when you have CLEAR answers to:
1. Document type and complexity
2. Processing volume
3. Key feature requirements (tables/equations/handwriting if applicable)

Don't rush to recommend. If anything is ambiguous, ask another clarifying question.

RECOMMENDATION FORMAT:
- Be concise (3-4 sentences total)
- Name the tier and engine, explain why in ONE sentence each
- Include this JSON block:
```json
{"recommendation": {"primary_tier": "basic", "alternative_tier": "free", "primary_reasons": ["handles printed documents", "table extraction", "API access"], "alternative_reasons": ["lower cost"], "selected_engine": "paddle-ocr-vl", "demo_tier": "basic"}}
```

AVAILABLE ENGINES ONLY:
- paddle-ocr-free (free tier)
- paddle-ocr-vl (basic tier)
- got-ocr2 (pro tier - handwriting, equations)
- qianfan-ocr (pro tier - KIE, medical, financial)
- infinity-parser2-flash (pro tier - fast document parsing, layout, tables)
- got-ocr2-enterprise (enterprise tier)
- qianfan-ocr-enterprise (enterprise tier)
- infinity-parser2-flash-enterprise (enterprise tier)

IMPORTANT: NEVER recommend TrOCR, trocr-base, trocr-handwritten, or any other engines not in the list above.
Use the knowledge base context and fingerprint analysis below to guide your questions."""


class AdvisorService:
    def __init__(self) -> None:
        self._client = None

    def _get_llm_client(self):
        if self._client is not None:
            return self._client

        if settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
            from openai import OpenAI

            self._client = OpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
            )
        elif settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
            from openai import OpenAI

            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def _llm_streaming_enabled(self) -> bool:
        return (
            self._get_llm_client() is not None
            and settings.LLM_PROVIDER in {"openai", "groq"}
        )

    def describe_llm_mode(self) -> str:
        return "llm" if self._llm_streaming_enabled() else "scripted"

    def build_response_meta(self, chunks: list[dict]) -> dict:
        rag_info = rag_retriever.describe_mode()
        return {
            "rag_mode": rag_info["rag_mode"],
            "llm_mode": self.describe_llm_mode(),
            "rag_chunk_count": len(chunks),
            "rag_sources": rag_retriever.chunk_sources(chunks),
            "indexed_chunks": rag_info["indexed_chunks"],
        }

    def build_messages(
        self, db: Session, session: ChatSession, user_message: str
    ) -> tuple[list[dict], dict]:
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at)
            .all()
        )

        fingerprint = session.document.fingerprint_json if session.document else {}
        phase = self._determine_phase(history, session)
        rag_query = f"{user_message}" + (f" document: {json.dumps(fingerprint)}" if fingerprint else "")
        chunks = rag_retriever.retrieve(
            rag_query,
            fingerprint=fingerprint,
            phase=phase,
        )
        context = rag_retriever.format_context(chunks)
        
        # Only include document analysis if we have a document
        doc_context = ""
        if session.document:
            doc_name = session.document.filename
            document_analysis = format_fingerprint_for_prompt(fingerprint, doc_name)
            doc_context = f"\n\nDocument analysis:\n{document_analysis}"

        messages = [
            {
                "role": "system",
                "content": (
                    SYSTEM_PROMPT
                    + doc_context
                    + f"\n\nKnowledge base:\n{context}"
                ),
            },
        ]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        meta = self.build_response_meta(chunks)
        return messages, meta

    async def stream_response(
        self, db: Session, session: ChatSession, user_message: str
    ) -> AsyncGenerator[str | dict, None]:
        messages, response_meta = self.build_messages(db, session, user_message)
        yield {"event": "meta", "data": response_meta}
        client = self._get_llm_client()

        full_response = ""
        if client and self._llm_streaming_enabled():
            stream = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                stream=True,
                temperature=0.7,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    full_response += delta
                    yield delta
        else:
            full_response = self._mock_response(db, session, user_message)
            for word in full_response.split(" "):
                yield word + " "
                import asyncio
                await asyncio.sleep(0.02)

        recommendation = self._extract_recommendation(full_response)
        metadata: dict = {"response_meta": response_meta}
        if recommendation:
            recommendation = self._enrich_recommendation(db, recommendation)
            metadata["recommendation"] = recommendation
            yield {"event": "recommendation", "data": {"recommendation": recommendation}}

        if recommendation:
            session.phase = "RECOMMENDATION"
            primary = recommendation.get("primary_tier")
            if primary:
                tier = registry_service.get_tier_by_slug(db, primary)
                if tier:
                    session.recommendation_tier_id = tier.id
                engine_slug = normalize_engine_slug(recommendation.get("selected_engine"))
                if engine_slug:
                    recommendation["selected_engine"] = engine_slug
                    engine = registry_service.get_engine_by_slug(db, engine_slug)
                    if engine:
                        session.selected_engine_id = engine.id
                    else:
                        fingerprint = (
                            session.document.fingerprint_json if session.document else {}
                        )
                        match = registry_service.select_engine_for_document(
                            db, primary, fingerprint
                        )
                        if match:
                            session.selected_engine_id = match.engine.id
                            recommendation["selected_engine"] = match.engine.slug
                            recommendation["selected_engine_name"] = match.engine.display_name
                            metadata["recommendation"] = recommendation

        db.add(
            ChatMessage(
                session_id=session.id,
                role="assistant",
                content=self._strip_recommendation_block(full_response),
                metadata_json=metadata,
            )
        )
        session.updated_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
        db.commit()

    def _mock_response(self, db: Session, session: ChatSession, user_message: str) -> str:
        """Generate dynamic mock responses based on conversation context."""
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at)
            .all()
        )
        
        user_messages = [msg.content.lower() for msg in history if msg.role == "user"]
        all_context = " ".join(user_messages)
        
        # Extract what we know from the conversation
        doc_types_mentioned = self._extract_document_types(all_context)
        volume_mentioned = self._extract_volume(all_context)
        features_mentioned = self._extract_features(all_context)
        accuracy_mentioned = any(word in all_context for word in ["accuracy", "precise", "exact", "quality", "error"])
        
        # Determine what to ask next
        msg_count = len(user_messages)
        
        # First question - if they haven't mentioned document type clearly
        if msg_count == 1 and not doc_types_mentioned:
            return "Could you tell me more about the document types? For example, are they invoices, forms, research papers, handwritten notes, or something else?"
        
        # Ask about special features if document type suggests it
        if msg_count <= 2 and doc_types_mentioned:
            if "invoice" in doc_types_mentioned or "form" in doc_types_mentioned:
                if "table" not in all_context and "field" not in all_context:
                    return "Do these documents contain tables or structured fields that need to be extracted individually?"
            elif "research" in doc_types_mentioned or "academic" in doc_types_mentioned or "scientific" in doc_types_mentioned:
                if "equation" not in all_context and "formula" not in all_context:
                    return "Do these documents contain mathematical equations or formulas that need to be preserved?"
            elif "note" in doc_types_mentioned or "handwritten" in all_context or "handwriting" in all_context:
                if msg_count == 1:
                    return "What percentage of your documents contain handwriting, and is it cursive or printed?"
        
        # Ask about volume if not mentioned yet
        if not volume_mentioned and msg_count <= 3:
            return "What's your expected monthly processing volume? (e.g., 100 pages, 5,000 pages, 50k+ pages)"
        
        # Ask about accuracy if we have type and volume but not accuracy
        if doc_types_mentioned and volume_mentioned and not accuracy_mentioned and msg_count <= 4:
            return "How critical is extraction accuracy for your use case? Do you need structured data output, or is approximate text sufficient?"
        
        # If we have enough information, make a recommendation
        if doc_types_mentioned and volume_mentioned:
            return self._generate_recommendation(db, doc_types_mentioned, volume_mentioned, features_mentioned, all_context)
        
        # Fallback - ask for more context
        return "Could you provide more details about your use case? What types of documents and what's your processing volume?"
    
    def _extract_document_types(self, text: str) -> list[str]:
        """Extract mentioned document types from conversation."""
        types = []
        type_keywords = {
            "invoice": ["invoice", "bill", "receipt"],
            "form": ["form", "application", "survey"],
            "research": ["research", "paper", "academic", "journal", "scientific"],
            "contract": ["contract", "agreement", "legal"],
            "handwritten": ["handwritten", "handwriting", "note", "manuscript"],
            "medical": ["medical", "prescription", "health", "clinical"],
            "financial": ["financial", "statement", "report"],
        }
        for doc_type, keywords in type_keywords.items():
            if any(kw in text for kw in keywords):
                types.append(doc_type)
        return types
    
    def _extract_volume(self, text: str) -> str | None:
        """Extract processing volume from conversation."""
        # Look for numbers followed by volume indicators
        import re
        patterns = [
            r"(\d+[,\d]*)\s*(?:pages?|documents?|files?)",
            r"(\d+[,\d]*)\s*(?:per|/)\s*(?:month|day|week)",
            r"(?:volume|processing).*?(\d+[,\d]*)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).replace(",", "")
        
        # Look for qualitative volume indicators
        if any(word in text for word in ["high volume", "large scale", "bulk", "thousands"]):
            return "high"
        if any(word in text for word in ["low volume", "small scale", "few", "hundreds"]):
            return "low"
        
        return None
    
    def _extract_features(self, text: str) -> dict:
        """Extract special feature requirements from conversation."""
        return {
            "tables": any(word in text for word in ["table", "tabular", "grid", "column"]),
            "equations": any(word in text for word in ["equation", "formula", "math", "latex"]),
            "handwriting": any(word in text for word in ["handwriting", "handwritten", "cursive", "manuscript"]),
            "multilingual": any(word in text for word in ["language", "multilingual", "chinese", "arabic", "japanese"]),
        }
    
    def _generate_recommendation(self, db: Session, doc_types: list[str], volume: str | None, features: dict, context: str) -> str:
        """Generate tier recommendation based on gathered information."""
        # Determine tier based on complexity
        primary = "basic"  # default
        
        # Upgrade based on features
        if features.get("handwriting") or (features.get("equations") and features.get("tables")):
            primary = "enterprise"
        elif features.get("equations") or "research" in doc_types or "scientific" in doc_types:
            primary = "pro"
        elif features.get("tables") and "invoice" in doc_types:
            primary = "basic"
        
        # Check for specialized extraction needs
        if "medical" in doc_types or "financial" in doc_types:
            if primary == "basic":
                primary = "pro"
        
        # Adjust based on volume
        try:
            if volume and volume.replace(",", "").isdigit():
                vol_num = int(volume.replace(",", ""))
                if vol_num > 10000:
                    if primary == "basic":
                        primary = "pro"
                elif vol_num < 100:
                    if primary == "basic":
                        primary = "free"
        except:
            pass
        
        if volume == "high" and primary == "basic":
            primary = "pro"
        elif volume == "low" and primary == "basic":
            primary = "free"
        
        # Select engine - prioritize based on document characteristics
        fingerprint = {
            "has_tables": features.get("tables", False),
            "has_equations": features.get("equations", False),
            "has_handwriting": features.get("handwriting", False),
        }
        
        # Add doc type to fingerprint for better matching
        if doc_types:
            fingerprint["doc_type"] = doc_types[0]
        
        match = registry_service.select_engine_for_document(db, primary, fingerprint)
        
        # Fallback logic if no match (ensure we never use trocr)
        if not match:
            if primary == "free":
                engine_slug = "paddle-ocr-free"
            elif primary == "basic":
                engine_slug = "paddle-ocr-vl"
            elif primary == "pro":
                if features.get("handwriting") or features.get("equations"):
                    engine_slug = "got-ocr2"
                elif features.get("charts") or fingerprint.get("layout_complexity") == "complex":
                    engine_slug = "infinity-parser2-flash"
                else:
                    engine_slug = "qianfan-ocr"
            else:  # enterprise
                if features.get("handwriting") or features.get("equations"):
                    engine_slug = "got-ocr2-enterprise"
                elif features.get("charts") or fingerprint.get("layout_complexity") == "complex":
                    engine_slug = "infinity-parser2-flash-enterprise"
                else:
                    engine_slug = "qianfan-ocr-enterprise"
            engine = registry_service.get_engine_by_slug(db, engine_slug)
        else:
            engine_slug = match.engine.slug
            engine = match.engine
        
        engine_name = engine.display_name if engine else engine_slug
        
        alt = "pro" if primary == "enterprise" else ("basic" if primary == "pro" else "free")
        
        rec = {
            "primary_tier": primary,
            "alternative_tier": alt,
            "primary_reasons": [
                f"Optimized for {', '.join(doc_types) if doc_types else 'your document types'}",
                f"Handles {', '.join(k for k, v in features.items() if v) if any(features.values()) else 'standard features'}",
                f"Scales to your {volume or 'processing'} volume",
            ],
            "alternative_reasons": ["Cost-effective option if volume is lower"],
            "selected_engine": engine_slug,
            "demo_tier": primary,
        }
        tier_names = {"free": "Starter", "basic": "Essential", "pro": "Professional", "enterprise": "Enterprise"}
        rec = self._enrich_recommendation(db, rec)
        
        return (
            f"Based on our discussion, I recommend the **{tier_names.get(primary, primary)}** tier with **{engine_name}**. "
            f"This tier is well-suited for your {', '.join(doc_types) if doc_types else 'documents'} "
            f"{'with ' + ', '.join(k for k, v in features.items() if v) if any(features.values()) else ''} "
            f"at your {volume or ''} processing volume.\n\n"
            f"```json\n{json.dumps({'recommendation': rec}, indent=2)}\n```"
        )

    def _determine_phase(self, history: list[ChatMessage], session: ChatSession | None = None) -> str:
        if session and session.phase:
            phase = session.phase.lower()
            if phase in {"greeting", "discovery", "clarification", "recommendation"}:
                return phase

        user_messages = [msg for msg in history if msg.role == "user"]
        if not user_messages:
            return "greeting"
        if len(user_messages) <= 2:
            return "discovery"
        if len(user_messages) == 3:
            return "recommendation"
        return "clarification"

    def _enrich_recommendation(self, db: Session, recommendation: dict) -> dict:
        engine_slug = recommendation.get("selected_engine")
        if engine_slug and not recommendation.get("selected_engine_name"):
            engine = registry_service.get_engine_by_slug(db, engine_slug)
            if engine:
                recommendation["selected_engine_name"] = engine.display_name
        return recommendation

    def _extract_recommendation(self, text: str) -> dict | None:
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                return data.get("recommendation")
            except json.JSONDecodeError:
                pass

        start = text.find('{"recommendation"')
        if start == -1:
            start = text.find('{ "recommendation"')
        if start != -1:
            depth = 0
            for i in range(start, len(text)):
                if text[i] == "{":
                    depth += 1
                elif text[i] == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            data = json.loads(text[start : i + 1])
                            return data.get("recommendation")
                        except json.JSONDecodeError:
                            break
        return None

    def _strip_recommendation_block(self, text: str) -> str:
        cleaned = re.sub(r"```(?:json)?\s*[\s\S]*?```", "", text, flags=re.IGNORECASE)
        cleaned = re.sub(r"```(?:json)?[\s\S]*$", "", cleaned, flags=re.IGNORECASE)
        start = cleaned.find('{"recommendation"')
        if start == -1:
            start = cleaned.find('{ "recommendation"')
        if start != -1:
            depth = 0
            for i in range(start, len(cleaned)):
                if cleaned[i] == "{":
                    depth += 1
                elif cleaned[i] == "}":
                    depth -= 1
                    if depth == 0:
                        cleaned = cleaned[:start] + cleaned[i + 1 :]
                        break
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        return re.sub(r" +", " ", cleaned).strip()


advisor_service = AdvisorService()
