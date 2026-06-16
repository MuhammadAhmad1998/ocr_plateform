# Dynamic Questioning Implementation

## What Changed

### 1. **System Prompt** (`ocr_platform/app/advisor/service.py`)

**Before:**
- Fixed checklist of questions to ask (doc type, volume, features, workflow)
- Rigid conversation phases (GREETING → DISCOVERY → CLARIFICATION → RECOMMENDATION)
- LLM followed a script

**After:**
- Dynamic, contextual questioning based on what's uncertain
- LLM analyzes fingerprint confidence and asks relevant questions
- Examples-driven prompt showing how to adapt questions
- Freedom to ask what's contextually relevant

### 2. **Fingerprint Formatting** (`ocr_platform/app/advisor/fingerprint.py`)

**Before:**
- Simple list of detected features
- No confidence indicators
- Generic "trust user over fingerprint" message

**After:**
- Clear sections: **DETECTED** (high confidence), **FEATURES FOUND**, **UNCERTAIN**
- Visual indicators (✓, ⚠, 💡, 📝)
- Explicit instruction to ask about UNCERTAIN items, not DETECTED ones
- Routing hints to guide the conversation

### 3. **Mock Response Logic** (`ocr_platform/app/advisor/service.py`)

**Before:**
- Always asked "What type of documents?" regardless of detection
- Always asked "What's your monthly volume?" as second question
- Predictable, scripted flow

**After:**
- First question adapts to what's detected:
  - If type is known → ask about specific needs (field extraction, formula format, etc.)
  - If handwriting detected → ask about handwriting percentage
  - If type unknown → ask about document type
- Second question checks if volume was already mentioned
- More natural, contextual conversation

## Example Scenarios

### Scenario 1: Invoice with Tables (Type Clear)

**Fingerprint shows:**
- Type: form ✓
- Features: tables ✓
- Uncertainty: none

**Old behavior:**
"What type of documents will you be processing?"

**New behavior:**
"I can see this is a structured invoice with tables. Do you need individual line-item extraction, or just the overall text content?"

---

### Scenario 2: Scientific Paper (Complex Document)

**Fingerprint shows:**
- Type: scientific ✓
- Features: equations, multi-column ✓
- Uncertainty: none

**Old behavior:**
"What type of documents will you be processing?"

**New behavior:**
"This appears to be a scientific document with equations. Do you need LaTeX-formatted formulas preserved, or is plain text sufficient?"

---

### Scenario 3: Unknown Document Type

**Fingerprint shows:**
- Type: unknown ⚠
- Features: none
- Uncertainty: document type unclear

**Old behavior:**
"What type of documents will you be processing?"

**New behavior (similar but for the right reason):**
"The document is uploaded. What type of documents will you primarily be processing? (e.g., invoices, contracts, research papers, forms)"

---

### Scenario 4: User Already Mentioned Volume

**User says:** "I process about 1000 invoices monthly"

**Old behavior:**
Still asks: "What's your expected monthly volume?"

**New behavior:**
Recognizes volume was mentioned, asks: "Got it. How critical is extraction accuracy for you—do you need structured data output, or is approximate text sufficient?"

## Testing

1. **Upload different document types:**
   - Invoice → Should recognize it and ask specific questions
   - Scientific paper → Should ask about equation formatting
   - Handwritten note → Should ask about handwriting percentage
   - Generic image → Should ask about document type

2. **Mention volume in first response:**
   - Old: Would still ask volume question
   - New: Should skip volume question and ask about quality/needs

3. **Upload similar documents:**
   - Each conversation should still be contextual to THAT document
   - Questions should adapt to what's detected in EACH specific file

## Backend Changes

Files modified:
- `ocr_platform/app/advisor/service.py` - System prompt and mock response
- `ocr_platform/app/advisor/fingerprint.py` - Enhanced fingerprint formatting

No database migrations needed.
No API changes.
Backend auto-reloaded with changes (no restart needed).

## Next Steps (Optional Enhancements)

1. **User preferences storage:** Remember answers across sessions
2. **Confidence scoring:** Calculate uncertainty scores programmatically
3. **RAG-guided questions:** Let knowledge base suggest relevant questions
4. **Session continuation:** Allow users to resume previous conversations
