import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import API_URL from '../../config';

// Initialize socket with dynamic URL
const socket = io(API_URL);
const [messages, setMessages] = useState([]);
const [input, setInput] = useState('');
const [conversationId, setConversationId] = useState(null);
const [isTyping, setIsTyping] = useState(false);
const messagesEndRef = useRef(null);

const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

useEffect(() => {
    // Initialize or join conversation
    const storedConvId = localStorage.getItem('conversationId');
    if (storedConvId) {
        setConversationId(storedConvId);
        socket.emit('join_conversation', storedConvId);
        // Fetch history
        fetchHistory(storedConvId);
    } else {
        socket.emit('join_conversation', null);
    }

    // Socket Listeners
    socket.on('conversation_started', (id) => {
        setConversationId(id);
        localStorage.setItem('conversationId', id);
    });

    socket.on('receive_message', (message) => {
        setMessages((prev) => [...prev, message]);
    });

    socket.on('typing', (status) => {
        setIsTyping(status);
    });

    return () => {
        socket.off('conversation_started');
        socket.off('receive_message');
        socket.off('typing');
    };
}, []);

useEffect(() => {
    scrollToBottom();
}, [messages, isTyping]);

const fetchHistory = async (id) => {
    try {
        const res = await axios.get(`${API_URL}/api/conversations/${id}/messages`);
        setMessages(res.data);
    } catch (err) {
        console.error("Failed to load history", err);
    }
};

const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!conversationId) {
        // Should wait for conversation_started, but ideally we request it on mount.
        // We can temporarily send without ID or handle edge case.
        // However, the socket.on('conversation_started') should have fired immediately on connection.
    }

    socket.emit('send_message', { conversationId, content: input });
    setInput('');
};

return (
    <div className="chat-container">
        <div className="chat-header">
            <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span role="img" aria-label="robot" style={{ fontSize: '1.5rem' }}>🤖</span>
                    CUSTOMER SUPPORT AI
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#6366f1' }}>● Online</span>
            </div>
        </div>

        <div className="chat-messages">
            {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                    {msg.content}
                    <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            ))}
            {isTyping && (
                <div className="message bot" style={{ width: 'fit-content' }}>
                    <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={sendMessage}>
            <input
                type="text"
                className="chat-input"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="send-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
        </form>
    </div>
);
};

export default ChatInterface;
