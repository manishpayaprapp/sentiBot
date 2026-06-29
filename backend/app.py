import pandas as pd
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline

app = Flask(__name__)
CORS(app)

# 1. Lexicon for 40-class emotion mapping & token highlighting
emotion_classes = {
    'joy': ['happy', 'love', 'amazing', 'brilliant', '🚀', '❤️', 'lol'],
    'outrage': ['terrible', 'hate', 'worst', '😡', 'disgusting'],
    'betrayal': ['lied', 'cheated', 'broken', 'fake'],
    'frustration': ['ugh', 'annoying', 'stuck', 'slow', 'smh'],
    'sadness': ['crying', 'sad', 'grief', 'lost', '😭'],
    'sarcasm': ['yeah right', 'oh great', 'sure']
}

positive_words = set(emotion_classes['joy'])
negative_words = set(emotion_classes['outrage'] + emotion_classes['frustration'] + emotion_classes['sadness'])

# 2. Train the Machine Learning Model on Startup
print("Loading Sentiment140 Dataset...")
columns = ['target', 'ids', 'date', 'flag', 'user', 'text']
# We load a sample of 50,000 rows for faster startup during development.
# Increase this to train on the full dataset later.
df = pd.read_csv('training.1600000.processed.noemoticon.csv', encoding='latin-1', names=columns).sample(50000, random_state=42)

def clean_tweet(text):
    text = re.sub(r'@[A-Za-z0-9_]+', '', text) # Remove mentions
    text = re.sub(r'https?:\/\/\S+', '', text) # Remove URLs
    return text.lower()

print("Training Scikit-Learn Model...")
df['cleaned_text'] = df['text'].apply(clean_tweet)
model = make_pipeline(TfidfVectorizer(max_features=10000, ngram_range=(1,2)), LogisticRegression(max_iter=500))
model.fit(df['cleaned_text'], df['target'])
print("Model trained and ready!")

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    raw_text = data.get('text', '')
    if not raw_text:
        return jsonify({"error": "No text provided"}), 400

    clean_text = clean_tweet(raw_text)
    
    # A. Aggregate Scoring via Machine Learning (Sentiment140)
    # Classes are 0 (Negative) and 4 (Positive)
    probs = model.predict_proba([clean_text])[0]
    neg_prob = probs[0]
    pos_prob = probs[1]
    
    # Scale to percentages, leaving a margin for "Neutral" based on uncertainty
    pos_score = round(pos_prob * 100)
    neg_score = round(neg_prob * 100)
    
    # If the model is uncertain (probabilities are close to 50/50), boost neutral
    neu_score = 0
    if abs(pos_prob - neg_prob) < 0.3:
        neu_score = round((0.3 - abs(pos_prob - neg_prob)) * 100)
        pos_score = max(0, pos_score - (neu_score // 2))
        neg_score = max(0, neg_score - (neu_score // 2))

    # B. Tokenization & Highlighting (Lexicon)
    raw_tokens = raw_text.split()
    highlighted_tokens = []
    
    for token in raw_tokens:
        clean_token = re.sub(r'[^\w\s🚀😡😭❤️]', '', token.lower())
        token_type = 'neutral'
        if clean_token in positive_words:
            token_type = 'pos'
        elif clean_token in negative_words:
            token_type = 'neg'
        
        highlighted_tokens.append({"word": token, "type": token_type})

    # C. Multi-class Emotion Tagging
    detected_emotions = []
    lower_text = raw_text.lower()
    for emotion, keywords in emotion_classes.items():
        if any(kw in lower_text for kw in keywords):
            detected_emotions.append(emotion)
            
    if not detected_emotions:
        detected_emotions.append("neutral")

    return jsonify({
        "tokens": highlighted_tokens,
        "emotions": detected_emotions,
        "aggregate": {
            "positive": pos_score,
            "neutral": neu_score,
            "negative": neg_score
        }
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)
