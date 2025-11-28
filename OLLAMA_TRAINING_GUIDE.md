# Ollama Installation & Model Training Guide

## 1. Install Ollama on Windows

### Installation Steps:
```powershell
# Download and install Ollama for Windows
# Visit: https://ollama.com/download/windows
# Or use PowerShell:
winget install Ollama.Ollama

# Verify installation
ollama --version
```

### Start Ollama Service:
```powershell
# Start Ollama server (keep this terminal open)
ollama serve
```

## 2. Use Pre-trained Models (Recommended First)

### Popular Models:
```powershell
# Llama 2 (7B - fast, good for most tasks)
ollama pull llama2

# Llama 2 13B (larger, more capable)
ollama pull llama2:13b

# Mistral (7B - excellent performance)
ollama pull mistral

# CodeLlama (specialized for code)
ollama pull codellama

# Phi-2 (2.7B - very fast, good for simple tasks)
ollama pull phi

# Neural Chat (7B - conversational)
ollama pull neural-chat
```

### Test a Model:
```powershell
ollama run llama2
# Type your questions and test it out
# Type /bye to exit
```

## 3. Fine-tune Your Own Model

### Option A: Create a Custom Modelfile (Easiest)

This allows you to customize system prompts and parameters without training:

```powershell
# Create a Modelfile
notepad Modelfile
```

**Modelfile content:**
```dockerfile
# Base model
FROM llama2

# Custom system prompt for ASTRAL
SYSTEM """
You are ASTRAL, an advanced AI assistant with deep Windows system integration.
You help users with tasks, answer questions, and provide intelligent assistance.
Be concise, helpful, and professional with a British personality.
You can control computers, launch applications, and manage system settings.
"""

# Parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx 4096

# Example conversations
MESSAGE user What's the weather like?
MESSAGE assistant I can help you check the weather. Let me access that information for you.
```

**Create the custom model:**
```powershell
ollama create astral-assistant -f Modelfile
ollama run astral-assistant
```

### Option B: Fine-tune with Your Own Data (Advanced)

To truly train a model with your own data, you need to:

#### Step 1: Prepare Training Data
Create a JSONL file with your training examples:

```json
{"prompt": "What time is it?", "response": "Let me check the current time for you."}
{"prompt": "Open Chrome", "response": "Opening Google Chrome now."}
{"prompt": "Start work mode", "response": "Activating work mode. Launching your productivity applications."}
{"prompt": "What's my CPU usage?", "response": "Let me check your system resources."}
```

#### Step 2: Use Unsloth or Similar Tools

```powershell
# Install Python and dependencies
pip install torch transformers datasets peft accelerate bitsandbytes

# Clone unsloth for efficient fine-tuning
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
```

**Create training script (train_astral.py):**
```python
from unsloth import FastLanguageModel
import torch

# Load base model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/llama-2-7b-bnb-4bit",
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = True,
)

# Prepare for training
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = True,
)

# Load your dataset
from datasets import load_dataset
dataset = load_dataset("json", data_files="astral_training.jsonl")

# Training arguments
from transformers import TrainingArguments, Trainer

trainer = Trainer(
    model = model,
    train_dataset = dataset["train"],
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        output_dir = "outputs",
    ),
)

trainer.train()

# Save model
model.save_pretrained("astral_model")
```

#### Step 3: Convert to GGUF for Ollama

```powershell
# Install llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Convert to GGUF format
python convert.py ../astral_model --outtype f16 --outfile astral-model.gguf

# Quantize (optional, for smaller size)
./quantize astral-model.gguf astral-model-q4.gguf Q4_K_M
```

#### Step 4: Import to Ollama

Create a Modelfile:
```dockerfile
FROM ./astral-model-q4.gguf

SYSTEM """Your custom system prompt here"""
```

Import:
```powershell
ollama create astral-custom -f Modelfile
ollama run astral-custom
```

## 4. Update ASTRAL to Use Your Model

Edit `src-tauri/src/llm_provider.rs`:

```rust
impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            provider: LLMProvider::Ollama,
            api_key: None,
            model: "astral-assistant".to_string(), // or "astral-custom"
            temperature: 0.7,
            max_tokens: 500,
            ollama_url: Some("http://localhost:11434".to_string()),
        }
    }
}
```

## 5. Quick Start (Recommended Path)

For immediate use without training:

```powershell
# 1. Install Ollama
winget install Ollama.Ollama

# 2. Start server
ollama serve

# 3. Pull a good model (in another terminal)
ollama pull mistral

# 4. Update ASTRAL config to use "mistral" model
# Edit Dashboard → Settings → Model name to "mistral"

# 5. Test in ASTRAL
# Click the orb and say "Explain how computers work"
```

## 6. Training Data Tips

To create effective training data for ASTRAL:

- **System Commands**: "open chrome", "check cpu usage", "what time is it"
- **Conversational**: "how are you", "tell me a joke", "what can you do"
- **Technical**: "explain neural networks", "what is machine learning"
- **Contextual**: Include British phrases and personality traits
- **Error Handling**: "I don't understand", "could you repeat that"

## 7. Performance Tips

- **Start with small models** (7B parameters) for faster responses
- **Use quantization** (Q4_K_M) for lower memory usage
- **Fine-tune only if needed** - often custom prompts are enough
- **Test thoroughly** before deploying custom models

## 8. Resources

- Ollama Models: https://ollama.com/library
- Unsloth Training: https://github.com/unslothai/unsloth
- Llama.cpp: https://github.com/ggerganov/llama.cpp
- Hugging Face: https://huggingface.co/models
- GGUF Conversion: https://github.com/ggerganov/llama.cpp/discussions/2948

---

**Next Steps:**
1. Install Ollama
2. Pull `mistral` or `llama2`
3. Test with ASTRAL
4. Create custom Modelfile with ASTRAL personality
5. (Optional) Fine-tune with your own data later
