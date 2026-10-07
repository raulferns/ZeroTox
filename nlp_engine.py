import os
import re
import json
import joblib
import numpy as np
from textblob import TextBlob
from typing import Dict, List, Any, Optional

class HateSpeechEngine:
    _instance = None

    def __init__(self, model_path: str = "models/hate_speech_model.joblib"):
        self.model_path = model_path
        self.pipeline = None
        self.class_mapping = {0: "Hate Speech", 1: "Offensive Language", 2: "Normal Speech"}
        self.top_features = {}
        self.metrics = {}
        self._load_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Trained model not found at {self.model_path}. Please run train_model.py first.")

        model_bundle = joblib.load(self.model_path)
        self.pipeline = model_bundle['pipeline']
        self.class_mapping = model_bundle.get('class_mapping', self.class_mapping)
        self.top_features = model_bundle.get('top_features', {})

        metrics_file = "models/model_metrics.json"
        if os.path.exists(metrics_file):
            try:
                with open(metrics_file, 'r', encoding='utf-8') as f:
                    self.metrics = json.load(f)
            except Exception:
                self.metrics = {}

    def clean_text(self, text: str) -> str:
        text = str(text)
        # Remove URLs
        text = re.sub(r'https?://\S+|www\.\S+', '', text)
        # Remove mentions
        text = re.sub(r'@\w+', '', text)
        # Decode common HTML entities
        text = re.sub(r'&#\d+;|&amp;|&quot;|&lt;|&gt;', ' ', text)
        # Remove RT prefixes
        text = re.sub(r'\brt\b', '', text, flags=re.IGNORECASE)
        # Normalize hashtags
        text = re.sub(r'#(\w+)', r'\1', text)
        # Lowercase
        text = text.lower()
        # Compress excessive repeated letters (e.g., 'sooooo hatefuuuul' -> 'soo hateful')
        text = re.sub(r'(.)\1{2,}', r'\1\1', text)
        # Clean extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def analyze_comment(self, raw_text: str) -> Dict[str, Any]:
        """
        Comprehensive NLP classification & explainability for a single comment.
        """
        cleaned = self.clean_text(raw_text)
        if not cleaned:
            return {
                "raw_text": raw_text,
                "clean_text": "",
                "label": "Normal Speech",
                "label_code": 2,
                "confidence": 1.0,
                "probabilities": {"Hate Speech": 0.0, "Offensive Language": 0.0, "Normal Speech": 1.0},
                "severity_score": 0.0,
                "action": "APPROVED",
                "action_badge": "Safe / No Violation",
                "sentiment": {"polarity": 0.0, "subjectivity": 0.0},
                "tokens": [],
                "explanation": "Empty or neutral message. No hate or offensive speech detected."
            }

        # Predict probabilities
        probas = self.pipeline.predict_proba([cleaned])[0]
        # probas: [p_hate, p_offensive, p_normal]
        p_hate = float(probas[0])
        p_offensive = float(probas[1])
        p_normal = float(probas[2])

        # Classification decision logic with safety-priority threshold
        # Hate speech is dangerous; if p_hate is substantial (>0.32) and higher than normal, or dominant
        if p_hate >= 0.38 and p_hate >= p_normal:
            pred_idx = 0
            label = "Hate Speech"
        elif p_offensive >= p_normal and p_offensive >= p_hate:
            pred_idx = 1
            label = "Offensive Language"
        elif p_hate > p_offensive and p_hate > p_normal:
            pred_idx = 0
            label = "Hate Speech"
        else:
            pred_idx = 2
            label = "Normal Speech"

        # Severity Score (0 to 100)
        # Calculated from Hate probability (weight 1.0) and Offensive probability (weight 0.5)
        severity = min(100.0, round((p_hate * 100.0) + (p_offensive * 45.0), 1))
        if label == "Normal Speech":
            severity = max(0.0, min(25.0, round(severity * 0.3, 1)))

        # Moderation Recommendation Action
        if label == "Hate Speech" or p_hate >= 0.50:
            action = "CRITICAL_FLAG"
            action_badge = "Auto-Flag & Remove (Hate Speech)"
            explanation = "Comment contains prohibited hate speech targeting individuals or protected social identity groups. Immediate removal and moderation review recommended."
        elif label == "Offensive Language" or severity >= 40.0:
            action = "WARN_OR_FILTER"
            action_badge = "Sensitivity Warning / Shadow Filter"
            explanation = "Comment contains offensive, profane, or aggressively vulgar language. Content should be hidden behind a sensitivity warning or reviewed."
        else:
            action = "APPROVED"
            action_badge = "Approved / Clean Content"
            explanation = "Comment complies with community guidelines. No hostile or toxic patterns identified."

        # Sentiment Analysis
        tb = TextBlob(raw_text)
        polarity = round(float(tb.sentiment.polarity), 2)
        subjectivity = round(float(tb.sentiment.subjectivity), 2)

        # Word Token Explainability / Token Highlights
        tokens_info = self._explain_tokens(cleaned)

        return {
            "raw_text": raw_text,
            "clean_text": cleaned,
            "label": label,
            "label_code": int(pred_idx),
            "confidence": round(float(probas[pred_idx]), 4),
            "probabilities": {
                "Hate Speech": round(p_hate, 4),
                "Offensive Language": round(p_offensive, 4),
                "Normal Speech": round(p_normal, 4)
            },
            "severity_score": severity,
            "action": action,
            "action_badge": action_badge,
            "sentiment": {
                "polarity": polarity,
                "subjectivity": subjectivity
            },
            "tokens": tokens_info,
            "explanation": explanation
        }

    def _explain_tokens(self, text: str) -> List[Dict[str, Any]]:
        """
        Token-level feature attribution based on trained model weights.
        """
        words = re.findall(r'\b\w+\b', text)
        if not words:
            return []

        # Extract features and classifier
        try:
            union = self.pipeline.named_steps['features']
            clf = self.pipeline.named_steps['clf']
            word_vectorizer = union.transformer_list[0][1]
            vocab = word_vectorizer.vocabulary_
            word_coef_hate = clf.coef_[0]
            word_coef_off = clf.coef_[1]

            results = []
            for w in words:
                w_lower = w.lower()
                weight = 0.0
                token_type = "neutral"

                if w_lower in vocab:
                    idx = vocab[w_lower]
                    w_hate = float(word_coef_hate[idx])
                    w_off = float(word_coef_off[idx])

                    if w_hate > 0.8:
                        token_type = "hate"
                        weight = round(w_hate, 2)
                    elif w_off > 0.8:
                        token_type = "offensive"
                        weight = round(w_off, 2)
                    elif w_hate < -0.5 or w_off < -0.5:
                        token_type = "normal"
                        weight = round(max(-w_hate, -w_off), 2)

                results.append({
                    "word": w,
                    "type": token_type,
                    "weight": weight
                })
            return results
        except Exception:
            return [{"word": w, "type": "neutral", "weight": 0.0} for w in words]

    def analyze_batch(self, comments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        High-throughput batch moderation on multiple social media / Instagram comments.
        Each item in `comments` should have at least 'text' or be a string.
        """
        classified_items = []
        counts = {"Hate Speech": 0, "Offensive Language": 0, "Normal Speech": 0}
        total_severity = 0.0

        for c in comments:
            if isinstance(c, str):
                item = {"text": c, "author": "anonymous", "likes": 0, "id": str(len(classified_items) + 1)}
            else:
                item = dict(c)
                if "text" not in item:
                    item["text"] = item.get("comment", "")

            analysis = self.analyze_comment(item["text"])
            item.update(analysis)
            counts[analysis["label"]] += 1
            total_severity += analysis["severity_score"]
            classified_items.append(item)

        total = len(classified_items) or 1
        avg_severity = round(total_severity / total, 1)

        # Post-level risk status
        if counts["Hate Speech"] > 0:
            post_status = "CRITICAL_THREAT"
            post_badge = "High Risk - Hate Speech Detected"
        elif counts["Offensive Language"] >= (total * 0.25):
            post_status = "ELEVATED_TOXICITY"
            post_badge = "Elevated Toxicity - High Profanity"
        else:
            post_status = "SAFE_CLEAN"
            post_badge = "Safe / Standard Online Discussion"

        return {
            "total_comments": len(classified_items),
            "summary_counts": counts,
            "percentages": {
                "Hate Speech": round((counts["Hate Speech"] / total) * 100, 1),
                "Offensive Language": round((counts["Offensive Language"] / total) * 100, 1),
                "Normal Speech": round((counts["Normal Speech"] / total) * 100, 1)
            },
            "average_severity": avg_severity,
            "post_status": post_status,
            "post_badge": post_badge,
            "comments": classified_items
        }

    def get_model_telemetry(self) -> Dict[str, Any]:
        """
        Returns model performance metrics, dataset distribution, and top learned features.
        """
        return self.metrics
