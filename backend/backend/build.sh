#!/bin/bash
apt-get install -y gcc g++ default-jdk-headless php ruby-full 2>/dev/null || true
pip install -r requirements.txt
npm install -g ts-node typescript 2>/dev/null || true

