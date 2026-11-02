import { useState } from 'react';
import axios from 'axios';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ email: '', password: '', companyName: '' });
    const [feedback, setFeedback] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback(null);
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        
        try {
            const response = await axios.post(`${baseUrl}${endpoint}`, formData);
            console.log('Succès:', response.data);
            setFeedback({ type: 'success', text: isLogin ? 'Connexion réussie !' : 'Inscription réussie !' });
            // Stocker le token JWT et rediriger
        } catch (error) {
            console.error('Erreur:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Une erreur est survenue';
            setFeedback({ type: 'error', text: errorMsg });
        }
    };

    return (
        <div className="auth-container">
            <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
            
            {feedback && (
                <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    backgroundColor: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: feedback.type === 'success' ? '#4ade80' : '#f87171',
                    border: `1px solid ${feedback.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    {feedback.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <input
                        type="text"
                        placeholder="Nom de l'entreprise"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                    />
                )}
                <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                />
                <input
                    type="password"
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                />
                <button type="submit">{isLogin ? 'Se connecter' : "S'inscrire"}</button>
            </form>
            <button type="button" onClick={() => { setIsLogin(!isLogin); setFeedback(null); }}>
                Basculer vers {isLogin ? 'Inscription' : 'Connexion'}
            </button>
        </div>
    );
}