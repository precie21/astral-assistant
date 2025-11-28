# 🎤 ASTRAL Voice Commands Reference

## Quick Start
1. Click the holographic orb
2. Wait for "Listening..."
3. Speak your command
4. ASTRAL responds!

---

## 🕐 Time & Date

| Command | Response |
|---------|----------|
| "What time is it?" | Current time |
| "Tell me the time" | Current time |
| "What's the date?" | Today's date with day name |
| "What day is it?" | Current date |

---

## 👋 Greetings

| Command | Response |
|---------|----------|
| "Hello" | Creative greeting (4 variations) |
| "Hi" | Random friendly greeting |
| "Hey" | Welcoming response |

---

## 🤖 AI Questions (Routes to Ollama)

### Math & Calculations
- "What is 6 times 12?"
- "Calculate the square root of 144"
- "What's 25% of 80?"
- "Solve 5 plus 8 times 3"

### General Knowledge
- "What is quantum computing?"
- "Explain machine learning"
- "Why is the sky blue?"
- "How does photosynthesis work?"

### Creative Queries
- "Tell me something interesting"
- "What's the meaning of life?"
- "Why do cats purr?"
- "What makes a good pizza?"

### Philosophy & Humor
- "What is consciousness?"
- "Tell me a joke"
- "Are we living in a simulation?"
- "What's your favorite color?"

**Note:** ANY complex question or unclear command automatically routes to AI for creative interpretation!

---

## ⚡ Automation Routines

### Morning Routine
- "Start morning routine"
- "Do the morning thing"
- "Morning mode"

**Actions:**
- Check weather
- Read news headlines
- Display calendar
- Play morning playlist
- Greet user

### Work Mode
- "Start work mode"
- "Work mode activate"
- "I need to focus"

**Actions:**
- Launch productivity apps
- Enable focus mode
- Mute notifications
- Open task manager
- Set work lighting

### Gaming Mode
- "Gaming mode"
- "Start gaming"
- "Let's play"

**Actions:**
- Optimize performance
- Disable notifications
- Launch Discord
- RGB lighting on
- Close background apps

### Evening Wind Down
- "Evening wind down"
- "Bedtime routine"
- "Time to sleep"

**Actions:**
- Dim lighting
- Close work apps
- Play relaxing music
- Set sleep timer
- Good night message

---

## 📊 System Information

| Command | Response |
|---------|----------|
| "System stats" | CPU, Memory, GPU usage |
| "How's my computer?" | System performance |
| "Check performance" | Resource usage |

**Note:** Currently shows mock data. Real stats coming soon!

---

## 🎮 Media Controls (Coming Soon)

### Playback
- "Play music"
- "Pause"
- "Resume"
- "Stop"

### Navigation
- "Next song"
- "Previous track"
- "Skip"
- "Go back"

### Volume
- "Volume up"
- "Volume down"
- "Mute"
- "Unmute"
- "Set volume to 50%"

---

## 🚀 App Launching (Coming Soon)

- "Open Chrome"
- "Launch VS Code"
- "Start Discord"
- "Open Spotify"
- "Launch Steam"

---

## ⚙️ Settings & Control

| Command | Purpose |
|---------|---------|
| "Open dashboard" | Show settings panel |
| "Test your voice" | Test TTS output |
| "Check connection" | Test LLM connection |
| "Help" | Show available commands |

---

## 🎨 Creative & Unclear Commands

ASTRAL now interprets unclear commands intelligently!

### Examples That Work:

**You:** "Do that thing with the numbers"  
**ASTRAL:** "Ah, you want a calculation! How about this: The golden ratio is approximately 1.618..."

**You:** "Start the work stuff"  
**ASTRAL:** "You mean work mode! Activating productivity mode now..."

**You:** "What's that word for when things are the same?"  
**ASTRAL:** "Could be 'identical', 'equivalent', or 'symmetrical' depending on context..."

**You:** "Calculate something cool"  
**ASTRAL:** "Did you know there are exactly 31,536,000 seconds in a year? Pretty cool, right?"

**You:** "Morning thing"  
**ASTRAL:** "Starting your morning routine! Let's get your day going..."

### How It Works:
1. If command is short and simple → Check for greetings, time, date
2. If command has math keywords → Route to AI
3. If command has "what", "how", "why", "explain" → Route to AI
4. **Everything else → Route to AI for creative interpretation**

No more "I don't understand" errors! ASTRAL makes educated guesses and offers helpful alternatives.

---

## 💡 Pro Tips

### Get Better Responses
1. **Be natural:** Speak like you're talking to a friend
2. **Be specific:** More context = better answers
3. **Be creative:** Try unusual questions - ASTRAL loves them!
4. **Be patient:** Complex questions take 2-5 seconds

### Examples of Great Commands:
✅ "Explain quantum entanglement like I'm five"  
✅ "What's the fastest way to learn Python?"  
✅ "Compare React vs Vue for beginners"  
✅ "Why do developers hate PHP?"  

### Commands to Avoid:
❌ Single words (too vague): "Computer"  
❌ Mumbled speech (microphone can't hear)  
❌ Background noise (mutes command)  

### Microphone Tips:
- Speak clearly and at normal pace
- Position microphone ~6 inches from mouth
- Reduce background noise
- Wait for "Listening..." before speaking
- Command processes when you stop talking

---

## 🎙️ Voice Quality Settings

### Browser TTS (Default)
- Free and instant
- Robotic voice
- System-dependent quality
- Always available

### Piper TTS (Recommended)
- Natural-sounding
- British or American accent
- Fast and local
- Requires setup (see PIPER_TTS_SETUP.md)

**Change In Dashboard:**
1. Open Dashboard (click top-right icon or say "open dashboard")
2. Settings tab
3. Voice Settings section
4. Enable "Use Piper TTS"
5. Select voice model
6. Adjust speaking speed
7. Click "Test Voice"

---

## 🐛 Troubleshooting

### "Not responding to my voice"
- Check microphone permissions
- Verify orb shows "Listening..."
- Wait for speech recognition to finish
- Try shorter commands first

### "Gives wrong answer"
- AI misheard command - rephrase it
- Background noise - reduce it
- Speak more clearly
- Check Ollama is running

### "Voice sounds robotic"
- You're using browser TTS (default)
- Setup Piper TTS for natural voice
- See PIPER_TTS_SETUP.md

### "Connection error"
- Check Ollama: `ollama serve`
- Verify model: `ollama list`
- Dashboard → Test LLM Connection

---

## 🚀 Advanced Usage

### Chain Commands (Coming Soon)
- "Start work mode and check my calendar"
- "What's the weather and play my morning playlist"

### Context Awareness
ASTRAL remembers the last 10 messages:
- "What is Python?" → Gets explanation
- "Is it better than JavaScript?" → Understands "it" = Python

### Multi-Step Reasoning
- "I need to learn web development, where should I start?"
- ASTRAL will create a learning path with steps

### Custom Automations
Edit `src-tauri/src/automation.rs` to create your own routines!

---

## 📚 More Information

- **Complete Features:** See `IMPLEMENTATION_STATUS.md`
- **AI Training:** See `OLLAMA_TRAINING_GUIDE.md`
- **Natural Voice:** See `PIPER_TTS_SETUP.md`
- **Recent Changes:** See `UPDATE_NOTES.md`

---

## ✨ Easter Eggs

Try these for fun responses:
- "Are you sentient?"
- "Do androids dream of electric sheep?"
- "What is your purpose?"
- "Tell me a dad joke"
- "Sing me a song"
- "What's your favorite movie?"

ASTRAL has personality - have fun discovering it! 😊

---

**Remember:** ASTRAL is learning and creative. The same question might get different responses based on context and mood. Enjoy your conversations!
