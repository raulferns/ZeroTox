import os
import re
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def clean_text_for_nlp(text):
    text = str(text)
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove @mentions
    text = re.sub(r'@\w+', '', text)
    # Decode HTML entities
    text = re.sub(r'&#\d+;|&amp;|&quot;|&lt;|&gt;', ' ', text)
    # Remove RT
    text = re.sub(r'\brt\b', '', text, flags=re.IGNORECASE)
    # Normalize hashtags (keep the word)
    text = re.sub(r'#(\w+)', r'\1', text)
    # Lowercase
    text = text.lower()
    # Normalize extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def train_and_evaluate():
    print("=" * 60)
    print("HATE SPEECH & OFFENSIVE LANGUAGE NLP MODEL TRAINING")
    print("=" * 60)

    dataset_path = os.path.join("data", "labeled_data.csv")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)
    print(f"Total samples: {len(df):,}")
    print(f"Class distribution: {df['class'].value_counts().to_dict()}")

    print("\nPreprocessing comments/tweets...")
    df['clean_text'] = df['tweet'].apply(clean_text_for_nlp)

    # Filter out empty texts
    df = df[df['clean_text'].str.len() > 1].reset_index(drop=True)

    X = df['clean_text']
    y = df['class']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"Train split: {len(X_train):,} samples | Test split: {len(X_test):,} samples")

    print("\nBuilding Feature Pipeline (Word TF-IDF + Character n-grams)...")
    union = FeatureUnion([
        ('word_tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=14000,
            sublinear_tf=True,
            min_df=2,
            strip_accents='unicode'
        )),
        ('char_tfidf', TfidfVectorizer(
            ngram_range=(3, 5),
            analyzer='char_wb',
            max_features=18000,
            sublinear_tf=True,
            min_df=2
        ))
    ])

    # Class weighting: Hate Speech (0) is minority (1,430), Offensive (1) is 19,190, Normal (2) is 4,163
    class_weights = {0: 3.2, 1: 1.0, 2: 1.6}

    classifier = LogisticRegression(
        class_weight=class_weights,
        max_iter=500,
        C=2.2,
        solver='lbfgs',
        n_jobs=-1,
        random_state=42
    )

    pipeline = Pipeline([
        ('features', union),
        ('clf', classifier)
    ])

    print("Fitting model...")
    pipeline.fit(X_train, y_train)

    print("\nEvaluating on holdout test set...")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)

    target_names = ['Hate Speech', 'Offensive Language', 'Normal Speech']
    report_dict = classification_report(y_test, y_pred, target_names=target_names, output_dict=True)
    report_str = classification_report(y_test, y_pred, target_names=target_names)
    print("\n" + report_str)

    cm = confusion_matrix(y_test, y_pred).tolist()
    acc = float(accuracy_score(y_test, y_pred))

    # Top features per class for interpretability
    feature_names = union.get_feature_names_out()
    top_features = {}
    for idx, class_name in enumerate(target_names):
        coef = classifier.coef_[idx]
        top_positive_idx = np.argsort(coef)[-20:][::-1]
        top_features[class_name] = [
            {"feature": feature_names[i].replace('word_tfidf__', '').replace('char_tfidf__', ''), "weight": round(float(coef[i]), 4)}
            for i in top_positive_idx
        ]

    os.makedirs("models", exist_ok=True)
    model_file = os.path.join("models", "hate_speech_model.joblib")
    metrics_file = os.path.join("models", "model_metrics.json")

    model_bundle = {
        'pipeline': pipeline,
        'class_mapping': {0: 'Hate Speech', 1: 'Offensive Language', 2: 'Normal Speech'},
        'top_features': top_features
    }

    joblib.dump(model_bundle, model_file, compress=3)
    print(f"Model saved to: {model_file}")

    metrics_data = {
        'accuracy': round(acc, 4),
        'classification_report': report_dict,
        'confusion_matrix': cm,
        'classes': target_names,
        'total_training_samples': int(len(X_train)),
        'total_test_samples': int(len(X_test)),
        'dataset_distribution': {
            'Hate Speech': int(df[df['class'] == 0].shape[0]),
            'Offensive Language': int(df[df['class'] == 1].shape[0]),
            'Normal Speech': int(df[df['class'] == 2].shape[0])
        },
        'top_features': top_features
    }

    with open(metrics_file, 'w', encoding='utf-8') as f:
        json.dump(metrics_data, f, indent=2)
    print(f"Metrics saved to: {metrics_file}")
    print("\nTraining completed successfully!")

if __name__ == "__main__":
    train_and_evaluate()
