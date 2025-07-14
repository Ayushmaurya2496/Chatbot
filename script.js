const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const sendStatus = document.getElementById('sendStatus');
const sendIcon = document.getElementById('sendIcon');
const loadingSpinner = document.getElementById('loadingSpinner');
const emojiBtn = document.getElementById('emojiBtn');
const attachmentBtn = document.getElementById('attachmentBtn');
const emojiPicker = document.getElementById('emojiPicker');
const refreshBtn = document.getElementById('refreshBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const quickReplies = document.getElementById('quickReplies');
const suggestedReplies = document.getElementById('suggestedReplies');
const voiceBtn = document.getElementById('voiceBtn');
const voiceIcon = document.getElementById('voiceIcon');
const voiceStopIcon = document.getElementById('voiceStopIcon');

// Voice functionality variables
let isListening = false;
let recognition = null;
let speechSynthesis = window.speechSynthesis;

// Initialize Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US'; 
        
        recognition.onstart = function() {
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceIcon.style.display = 'none';
            voiceStopIcon.style.display = 'block';
            showSendStatus('Listening... Speak now', 'info');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            messageInput.value = transcript;
            showSendStatus('Voice input received ✓', 'sent');
            // Auto-focus and resize input
            messageInput.focus();
            messageInput.dispatchEvent(new Event('input'));
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            showSendStatus(`Voice error: ${event.error}`, 'error');
            stopListening();
        };
        
        recognition.onend = function() {
            stopListening();
        };
    } else {
        console.warn('Speech recognition not supported in this browser');
        voiceBtn.style.display = 'none';
    }
}

function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            showSendStatus('Voice recognition error', 'error');
        }
    }
}

function stopListening() {
    if (recognition && isListening) {
        recognition.stop();
    }
    isListening = false;
    voiceBtn.classList.remove('listening');
    voiceIcon.style.display = 'block';
    voiceStopIcon.style.display = 'none';
}

function speakText(text) {
    if (speechSynthesis) {
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        // Try to use a good English voice
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.includes('en') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
        );
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        utterance.onstart = function() {
            showSendStatus('🔊 Speaking...', 'info');
        };
        
        utterance.onend = function() {
            showSendStatus('Speech complete ✓', 'sent');
        };
        
        utterance.onerror = function(event) {
            console.error('Speech synthesis error:', event);
            showSendStatus('Speech error', 'error');
        };
        
        speechSynthesis.speak(utterance);
    }
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
    setTimeout(() => {
        if (chatMessages) {
            chatMessages.scrollTo({
                top: chatMessages.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, 50);
}

function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const messageAvatar = document.createElement('div');
    messageAvatar.className = 'message-avatar';
    messageAvatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = content;
    
    // Add speaker button for bot messages
    if (!isUser) {
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'speaker-btn';
        speakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        speakerBtn.title = 'Play voice';
        speakerBtn.onclick = () => speakText(content);
        messageText.appendChild(speakerBtn);
    }
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = getCurrentTime();
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    messageDiv.appendChild(messageAvatar);
    messageDiv.appendChild(messageContent);
    
    // Insert before quick replies and suggested replies
    const quickRepliesElement = document.getElementById('quickReplies');
    chatMessages.insertBefore(messageDiv, quickRepliesElement);
    
    // Ensure smooth scrolling to bottom
    scrollToBottom();
    
    // Show new suggested replies after bot message
    if (!isUser) {
        updateSuggestedReplies();
        // Auto-speak disabled - users can manually click speaker button if needed
    }
}

function showTypingIndicator() {
    hideTypingIndicator(); // Remove any existing typing indicator
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const messageAvatar = document.createElement('div');
    messageAvatar.className = 'message-avatar';
    messageAvatar.innerHTML = '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    const typingDots = document.createElement('div');
    typingDots.className = 'typing-dots';
    typingDots.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    messageText.appendChild(typingDots);
    messageContent.appendChild(messageText);
    typingDiv.appendChild(messageAvatar);
    typingDiv.appendChild(messageContent);
    
    const quickRepliesElement = document.getElementById('quickReplies');
    chatMessages.insertBefore(typingDiv, quickRepliesElement);
    
    // Show typing indicator and scroll
    typingDiv.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function showSendStatus(message, type = 'info') {
    sendStatus.textContent = message;
    sendStatus.className = `send-status show ${type}`;
    
    setTimeout(() => {
        sendStatus.classList.remove('show');
    }, 3000);
}

function setLoadingState(isLoading) {
    if (isLoading) {
        sendButton.classList.add('loading');
        sendButton.disabled = true;
        messageInput.disabled = true;
    } else {
        sendButton.classList.remove('loading');
        sendButton.disabled = false;
        messageInput.disabled = false;
    }
}

function updateSuggestedReplies() {
    const replies = [
        "Tell me more",
        "That's helpful",
        "Can you explain?",
        "What else?",
        "Thank you",
        "I understand"
    ];
    
    const suggestedRepliesContainer = document.querySelector('.suggested-replies');
    const repliesContainer = suggestedRepliesContainer.querySelector('.suggested-reply');
    
    // Clear existing replies except the label
    suggestedRepliesContainer.querySelectorAll('.suggested-reply').forEach(reply => {
        reply.remove();
    });
    
    // Add new random replies
    const shuffled = replies.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    
    selected.forEach(reply => {
        const replyElement = document.createElement('div');
        replyElement.className = 'suggested-reply';
        replyElement.dataset.message = reply;
        replyElement.textContent = reply;
        suggestedRepliesContainer.appendChild(replyElement);
    });
}

async function sendMessage(messageText = null) {
    const message = messageText || messageInput.value.trim();
    if (!message) return;
    
    // Show that message is being sent
    showSendStatus('Sending message...', 'info');
    setLoadingState(true);
    
    addMessage(message, true);
    messageInput.value = '';
    
    // Show confirmation that message was sent
    setTimeout(() => {
        showSendStatus('Message sent ✓', 'sent');
    }, 500);
    
    showTypingIndicator();
    
    // Show that AI is thinking
    setTimeout(() => {
        showSendStatus('AI is thinking...', 'info');
    }, 1000);
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        
        hideTypingIndicator();
        setLoadingState(false);
        
        if (!response.ok) {
            let errorMessage = 'Something went wrong. Please try again.';
            
            if (response.status === 500) {
                const errorData = await response.json().catch(() => ({}));
                errorMessage = 'Server configuration error. Please check the API key setup.';
            } else if (response.status === 404) {
                errorMessage = 'Service unavailable. Please try again later.';
            } else {
                errorMessage = `Request failed with status ${response.status}. Please try again.`;
            }
            
            addMessage(errorMessage);
            showSendStatus('Failed to get response ✗', 'error');
            return;
        }
        
        const data = await response.json();
        
        if (data.response) {
            addMessage(data.response);
            showSendStatus('Response received ✓', 'sent');
        } else if (data.error) {
            addMessage(`Error: ${data.error}`);
            showSendStatus('Error in response ✗', 'error');
        } else {
            addMessage('Sorry, I encountered an error. Please try again.');
            showSendStatus('Unexpected response ✗', 'error');
        }
    } catch (error) {
        hideTypingIndicator();
        setLoadingState(false);
        console.error('Chat error:', error);
        
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Cannot connect to server. Please check if the server is running.';
        }
        
        addMessage(errorMessage);
        showSendStatus('Connection failed ✗', 'error');
    }
    
    messageInput.focus();
}

// Header button functions
function refreshChat() {
    // Clear all messages except the initial bot message
    const messages = chatMessages.querySelectorAll('.message:not(.typing-indicator)');
    messages.forEach((message, index) => {
        if (index > 0) { // Keep the first message
            message.remove();
        }
    });
    
    // Reset to initial state
    updateSuggestedReplies();
    showSendStatus('Chat refreshed', 'sent');
}

function minimizeChat() {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.style.transform = 'scale(0.8)';
    chatContainer.style.opacity = '0.8';
    showSendStatus('Chat minimized', 'info');
    
    setTimeout(() => {
        chatContainer.style.transform = 'scale(1)';
        chatContainer.style.opacity = '1';
    }, 2000);
}

function closeChat() {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.style.transform = 'scale(0)';
    chatContainer.style.opacity = '0';
    
    setTimeout(() => {
        showSendStatus('Chat would close in real app', 'info');
        chatContainer.style.transform = 'scale(1)';
        chatContainer.style.opacity = '1';
    }, 1500);
}

function toggleEmojiPicker() {
    emojiPicker.classList.toggle('show');
}

function insertEmoji(emoji) {
    const currentValue = messageInput.value;
    const cursorPosition = messageInput.selectionStart;
    const newValue = currentValue.slice(0, cursorPosition) + emoji + currentValue.slice(cursorPosition);
    
    messageInput.value = newValue;
    messageInput.focus();
    
    // Set cursor position after emoji
    const newCursorPosition = cursorPosition + emoji.length;
    messageInput.setSelectionRange(newCursorPosition, newCursorPosition);
    
    emojiPicker.classList.remove('show');
}

function handleAttachment() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,document/*,.pdf,.doc,.docx';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            showSendStatus(`File "${file.name}" selected`, 'sent');
            // In a real app, you would upload the file here
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

// Event listeners
sendButton.addEventListener('click', () => sendMessage());
refreshBtn.addEventListener('click', refreshChat);
minimizeBtn.addEventListener('click', minimizeChat);
closeBtn.addEventListener('click', closeChat);
emojiBtn.addEventListener('click', toggleEmojiPicker);
attachmentBtn.addEventListener('click', handleAttachment);

// Voice button event listener
voiceBtn.addEventListener('click', () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Quick reply buttons
quickReplies.addEventListener('click', (e) => {
    if (e.target.classList.contains('quick-reply-btn')) {
        const message = e.target.dataset.message;
        e.target.classList.add('selected');
        
        // Remove selection after a moment
        setTimeout(() => {
            e.target.classList.remove('selected');
        }, 300);
        
        sendMessage(message);
    }
});

// Suggested replies
suggestedReplies.addEventListener('click', (e) => {
    if (e.target.classList.contains('suggested-reply')) {
        const message = e.target.dataset.message;
        sendMessage(message);
    }
});

// Emoji picker
emojiPicker.addEventListener('click', (e) => {
    if (e.target.classList.contains('emoji')) {
        const emoji = e.target.dataset.emoji;
        insertEmoji(emoji);
    }
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.remove('show');
    }
});

// Focus on input when page loads
messageInput.focus();

// Add welcome animation
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.style.transform = 'translateY(20px)';
    chatContainer.style.opacity = '0';
    
    setTimeout(() => {
        chatContainer.style.transition = 'all 0.5s ease-out';
        chatContainer.style.transform = 'translateY(0)';
        chatContainer.style.opacity = '1';
    }, 100);
    
    // Initialize suggested replies
    updateSuggestedReplies();
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Load voices for speech synthesis (needed for some browsers)
    if (speechSynthesis) {
        speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = function() {
            speechSynthesis.getVoices();
        };
    }
});
