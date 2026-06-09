import json
import re
from collections.abc import AsyncGenerator

from sqlalchemy.orm import Session

from app.advisor.models import ChatMessage, ChatSession
from app.core.config import get_settings
from app.rag.retriever import rag_retriever
from app.registry.service import registry_service

settings = get_settings()

SYSTEM_PROMPT = """You are the Unified OCR Platform AI Advisor. Your job is to help users find the right OCR tier.

Conversation phases:
1. GREETING - Welcome user, confirm their uploaded document
2. DISCOVERY - Ask about document type, languages, volume, complexity (tables/equations/handwriting), integration needs
3. CLARIFICATION - One follow-up if needed
4. Then provide recommendation

When ready to recommend, include a JSON block:
```json
{"recommendation": {"primary_tier": "pro", "alternative_tier": "basic", "primary_reasons": ["reason1"], "alternative_reasons": ["reason2"], "selected_engine": "engine-slug", "demo_tier": "pro"}}
```

Use tier slugs: free, basic, pro, enterprise. Never reveal internal model names to users - use tier public names.
Ground recommendations in the provided RAG context."""


class AdvisorService:
    def __init__(self) -> None:
        self._client = None

    def _get_openai_client(self):
        if self._client is None and settings.OPENAI_API_KEY:
            from openai import OpenAI
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    def build_messages(self, db: Session, session: ChatSession, user_message: str) -> list[dict]:
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at)
            .all()
        )

        fingerprint = session.document.fingerprint_json if session.document else {}
        rag_query = f"{user_message} document: {json.dumps(fingerprint)}"
        chunks = rag_retriever.retrieve(rag_query)
        context = rag_retriever.format_context(chunks)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + f"\n\nKnowledge base:\n{context}"},
        ]
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        return messages

    async def stream_response(
        self, db: Session, session: ChatSession, user_message: str
    ) -> AsyncGenerator[str, None]:
        messages = self.build_messages(db, session, user_message)
        client = self._get_openai_client()

        full_response = ""
        if client and settings.LLM_PROVIDER == "openai":
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
        metadata = {"recommendation": recommendation} if recommendation else None

        if recommendation:
            session.phase = "RECOMMENDATION"
            primary = recommendation.get("primary_tier")
            if primary:
                tier = registry_service.get_tier_by_slug(db, primary)
                if tier:
                    session.recommendation_tier_id = tier.id
                engine_slug = recommendation.get("selected_engine")
                if engine_slug:
                    engine = registry_service.get_engine_by_slug(db, engine_slug)
                    if engine:
                        session.selected_engine_id = engine.id
                    elif session.document:
                        match = registry_service.select_engine_for_document(
                            db, primary, session.document.fingerprint_json
                        )
                        if match:
                            session.selected_engine_id = match.engine.id
                            recommendation["selected_engine"] = match.engine.slug

        db.add(
            ChatMessage(
                session_id=session.id,
                role="assistant",
                content=full_response,
                metadata_json=metadata,
            )
        )
        session.updated_at = __import__("datetime").datetime.now(__import__("datetime").UTC)
        db.commit()

    def _mock_response(self, db: Session, session: ChatSession, user_message: str) -> str:
        msg_count = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id, ChatMessage.role == "user")
            .count()
        )
        doc_name = session.document.filename if session.document else "your document"

        if msg_count <= 1:
            return (
                f"Welcome! I can see you've uploaded **{doc_name}**. I'll ask a few quick questions "
                "to recommend the best OCR tier for your needs.\n\n"
                "What type of documents will you be processing most often? "
                "(e.g., invoices, scientific papers, handwritten notes, forms)"
            )
        if msg_count == 2:
            return (
                "Got it. A couple more questions:\n\n"
                "1. What's your expected monthly document volume?\n"
                "2. Do your documents contain tables, equations, or handwriting?"
            )
        if msg_count == 3:
            fingerprint = session.document.fingerprint_json if session.document else {}
            if (
                fingerprint.get("has_handwriting")
                or (
                    fingerprint.get("has_tables")
                    and fingerprint.get("has_equations")
                )
                or fingerprint.get("layout_complexity") == "complex"
            ):
                primary = "enterprise"
            elif fingerprint.get("has_equations") or fingerprint.get("doc_type") == "scientific":
                primary = "pro"
            else:
                primary = "basic"

            alt = "pro" if primary == "enterprise" else ("basic" if primary == "pro" else "free")
            match = registry_service.select_engine_for_document(db, primary, fingerprint)
            engine_slug = match.engine.slug if match else "trocr-base"

            rec = {
                "primary_tier": primary,
                "alternative_tier": alt,
                "primary_reasons": [
                    "Best match for your document complexity",
                    "Supports your required capabilities",
                    "Optimized for the detected layout and content signals",
                ],
                "alternative_reasons": ["Lower cost option if volume is moderate"],
                "selected_engine": engine_slug,
                "demo_tier": primary,
            }
            tier_names = {"free": "Starter", "basic": "Essential", "pro": "Professional", "enterprise": "Enterprise"}
            return (
                f"Based on your document and requirements, I recommend the **{tier_names.get(primary, primary)}** tier.\n\n"
                f"**Why {tier_names.get(primary, primary)}?**\n"
                + "\n".join(f"- {r}" for r in rec["primary_reasons"])
                + f"\n\n**Alternative:** {tier_names.get(alt, alt)} tier for lower cost.\n\n"
                "I'll now run a live demo on your uploaded document using the recommended tier.\n\n"
                f"```json\n{json.dumps({'recommendation': rec}, indent=2)}\n```"
            )
        return "Is there anything else you'd like to know about the recommended tier or our OCR capabilities?"

    def _extract_recommendation(self, text: str) -> dict | None:
        match = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(1))
                return data.get("recommendation")
            except json.JSONDecodeError:
                pass
        return None


advisor_service = AdvisorService()
