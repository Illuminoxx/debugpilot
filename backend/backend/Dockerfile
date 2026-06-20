FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-jdk-headless \
    php \
    ruby-full \
    nodejs \
    npm \
    && npm install -g ts-node typescript \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]