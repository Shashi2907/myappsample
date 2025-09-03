<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retail Mate Virtual Assistant</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
        }
        .message {
            max-width: 80%;
            padding: 1rem;
            border-radius: 1rem;
            margin-bottom: 1rem;
        }
        .user-message {
            background-color: #2563eb;
            color: white;
            align-self: flex-end;
            border-bottom-right-radius: 0;
        }
        .bot-message {
            background-color: #e5e7eb;
            color: #1f2937;
            align-self: flex-start;
            border-bottom-left-radius: 0;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            justify-content: center;
            align-items: center;
        }
        .modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 1rem;
            width: 90%;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <!-- Main Chat Container -->
    <div class="bg-white rounded-xl shadow-lg w-full max-w-xl h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-xl">
            <h1 class="text-xl font-bold">Retail Mate Assistant</h1>
            <p class="text-sm opacity-80" id="user-id">Connecting...</p>
        </div>

        <!-- Chat messages container -->
        <div id="chat-window" class="flex-grow p-4 overflow-y-auto space-y-4">
            <!-- Initial bot message -->
            <div class="flex">
                <div class="message bot-message">
                    <p>Hello! I'm your virtual assistant. How can I help you today?</p>
                </div>
            </div>
        </div>

        <!-- Chat Input and Buttons -->
        <div class="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <input
                id="user-input"
                type="text"
                class="flex-grow rounded-full border-gray-300 border-2 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                placeholder="Ask a question..."
                onkeypress="handleKeyPress(event)"
                disabled
            />
            <button
                id="send-button"
                class="bg-blue-600 text-white rounded-full px-6 py-2 font-semibold hover:bg-blue-700 transition duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                onclick="sendMessage()"
                disabled
            >
                Send
            </button>
            <button
                id="human-button"
                class="bg-gray-200 text-gray-700 rounded-full px-6 py-2 font-semibold hover:bg-gray-300 transition duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                onclick="showHumanModal()"
                disabled
            >
                Speak with a human
            </button>
        </div>
    </div>

    <!-- Modal for "Speak with a human" -->
    <div id="human-modal" class="modal">
        <div class="modal-content">
            <h2 class="text-2xl font-bold mb-4">Contacting a Human Agent</h2>
            <p class="text-gray-600 mb-6">Thank you for reaching out. An agent has been notified and will be with you shortly. Please provide your email for a follow-up.</p>
            <input type="email" placeholder="Your email address" class="w-full p-2 border border-gray-300 rounded-lg mb-4">
            <button onclick="closeModal()" class="bg-blue-600 text-white rounded-full px-6 py-2 font-semibold hover:bg-blue-700 transition duration-300">
                Close
            </button>
        </div>
    </div>

    <!-- Firebase SDKs -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, collection, query, addDoc, onSnapshot, orderBy, serverTimestamp, getDocs, setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // Set Firestore log level for debugging
        setLogLevel('Debug');
        
        // Use global variables provided by the canvas environment
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // UI elements
        const chatWindow = document.getElementById('chat-window');
        const userInput = document.getElementById('user-input');
        const sendButton = document.getElementById('send-button');
        const humanButton = document.getElementById('human-button');
        const humanModal = document.getElementById('human-modal');
        const userIdDisplay = document.getElementById('user-id');

        let userId = null;
        let isAuthReady = false;

        // Chatbot knowledge base
        const knowledgeBase = {
            "shipping": "Shipping typically takes 3-5 business days. You can track your order using the link provided in your confirmation email.",
            "return policy": "Our return policy allows returns within 30 days of purchase for a full refund. Items must be in their original condition.",
            "refund": "Refunds are processed to your original payment method within 7-10 business days after we receive your returned item.",
            "payment methods": "We accept all major credit cards, PayPal, and Apple Pay.",
            "contact support": "You can reach our support team by emailing support@retailmate.com or by speaking with a human agent using the button below.",
            "hello": "Hi there! How can I assist you today?",
            "hi": "Hello! What can I help you with?",
            "what is your name": "I am Retail Mate's virtual assistant. How can I help?",
            "bye": "Goodbye! Have a great day.",
            "thank you": "You're welcome! Is there anything else I can help with?"
        };

        // Function to create and add a message bubble to the chat window
        function addMessage(text, sender) {
            const messageContainer = document.createElement('div');
            messageContainer.classList.add('flex', 'p-2', 'rounded-lg');
            
            const messageBubble = document.createElement('div');
            messageBubble.classList.add('message');
            
            if (sender === 'user') {
                messageContainer.classList.add('justify-end');
                messageBubble.classList.add('user-message');
            } else {
                messageContainer.classList.add('justify-start');
                messageBubble.classList.add('bot-message');
            }

            messageBubble.innerHTML = `<p>${text}</p>`;
            messageContainer.appendChild(messageBubble);
            chatWindow.appendChild(messageContainer);
            chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to the bottom
        }

        // Main function to handle sending a message and getting a response
        async function sendMessage() {
            const userText = userInput.value.trim();
            if (userText === '') return;

            // Save user message to Firestore
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/messages`), {
                text: userText,
                sender: 'user',
                timestamp: serverTimestamp()
            });

            userInput.value = '';

            // Get bot response and save to Firestore
            const botResponse = getBotResponse(userText);
            setTimeout(async () => {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/messages`), {
                    text: botResponse,
                    sender: 'bot',
                    timestamp: serverTimestamp()
                });
            }, 500); // Simulate a typing delay
        }

        // Function to get a response from the knowledge base
        function getBotResponse(userText) {
            const lowerCaseText = userText.toLowerCase();
            
            // Check for direct matches in the knowledge base
            for (const key in knowledgeBase) {
                if (lowerCaseText.includes(key)) {
                    return knowledgeBase[key];
                }
            }

            // If no direct match is found, provide a fallback response
            return "I'm sorry, I don't have information on that. You can try rephrasing your question or speak with a human agent.";
        }
        
        // Handle Enter key press
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !sendButton.disabled) {
                sendMessage();
            }
        }

        // Show the "Speak with a human" modal
        function showHumanModal() {
            humanModal.style.display = 'flex';
        }

        // Close the modal
        function closeModal() {
            humanModal.style.display = 'none';
        }

        // Authentication and Firestore setup
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplay.textContent = `User ID: ${userId}`;
                userInput.disabled = false;
                sendButton.disabled = false;
                humanButton.disabled = false;
                isAuthReady = true;

                // Listen for real-time updates to the chat messages
                const messagesQuery = query(collection(db, `artifacts/${appId}/users/${userId}/messages`), orderBy('timestamp'));

                onSnapshot(messagesQuery, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const messageData = change.doc.data();
                            addMessage(messageData.text, messageData.sender);
                        }
                    });
                });

            } else {
                // Not signed in, attempt to sign in with custom token or anonymously
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Firebase Auth error:", error);
                    userIdDisplay.textContent = "Error: Could not authenticate.";
                }
            }
        });

    </script>
</body>
</html>
