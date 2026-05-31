#!/bin/sh
if which wget > /dev/null; then
  echo "Using wget to download worldcup2026.json"
  wget https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json || echo 'Not able to wget worldcup2026.json'
elif which curl > /dev/null; then
  echo "Using curl to download worldcup2026.json"
  curl -o worldcup2026.json https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.json || echo 'Not able to curl worldcup2026.json'
else
  echo "Neither wget nor curl is available. Please install one of them to download worldcup2026.json."
fi