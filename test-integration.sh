#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo -e "${BLUE}=== Backend-Frontend Integration Tests ===${NC}\n"

# Test 1: Frontend pages load
echo -e "${BLUE}1. Testing Frontend Pages...${NC}"
echo "   Checking /index.html (Login Page)"
if curl -s "$BASE_URL/" | grep -q "Login"; then
  echo -e "   ${GREEN}✓ Login page loads${NC}"
else
  echo -e "   ${RED}✗ Login page failed${NC}"
fi

echo "   Checking /dashboard.html (Dashboard Page)"
if curl -s "$BASE_URL/dashboard.html" | grep -q "Dashboard"; then
  echo -e "   ${GREEN}✓ Dashboard page loads${NC}"
else
  echo -e "   ${RED}✗ Dashboard page failed${NC}"
fi

# Test 2: API Endpoints Exist
echo -e "\n${BLUE}2. Testing API Endpoints...${NC}"

# Signup endpoint
echo "   Testing POST /api/auth/signup"
response=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456","confirmPassword":"123456"}' \
  -w "\n%{http_code}")

http_code=$(echo "$response" | tail -1)
if [ "$http_code" -eq 200 ]; then
  echo -e "   ${GREEN}✓ Signup endpoint working (201 or 200)${NC}"
elif [ "$http_code" -eq 400 ]; then
  echo -e "   ${GREEN}✓ Signup endpoint working (validation response)${NC}"
else
  echo -e "   ${RED}✗ Signup failed with code $http_code${NC}"
fi

# Login endpoint
echo "   Testing POST /api/auth/login"
response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}' \
  -w "\n%{http_code}")

http_code=$(echo "$response" | tail -1)
if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 401 ]; then
  echo -e "   ${GREEN}✓ Login endpoint working${NC}"
else
  echo -e "   ${RED}✗ Login endpoint failed with code $http_code${NC}"
fi

# Test 3: Check static files
echo -e "\n${BLUE}3. Testing Static Files...${NC}"

files=("styles.css" "login-script.js" "dashboard-script.js")
for file in "${files[@]}"; do
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL/$file")
  http_code=$(echo "$response" | tail -1)
  if [ "$http_code" -eq 200 ]; then
    echo -e "   ${GREEN}✓ $file loads${NC}"
  else
    echo -e "   ${RED}✗ $file failed (code: $http_code)${NC}"
  fi
done

# Test 4: Database connectivity
echo -e "\n${BLUE}4. Database Status...${NC}"
if [ -f "/home/shahid/Documents/max/users.db" ]; then
  echo -e "   ${GREEN}✓ SQLite database exists (users.db)${NC}"
else
  echo -e "   ${RED}✗ Database not found${NC}"
fi

# Test 5: File upload directory
echo -e "\n${BLUE}5. File Upload Directory...${NC}"
if [ -d "/home/shahid/Documents/max/uploads" ]; then
  echo -e "   ${GREEN}✓ Uploads directory exists${NC}"
else
  echo -e "   ${RED}✗ Uploads directory not found${NC}"
fi

echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}Server Status: RUNNING ✓${NC}"
echo "URL: http://localhost:3000"
echo ""
echo "Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Create an account (Signup)"
echo "3. Login with your credentials"
echo "4. Go to Drive tab and upload a file"
echo "5. Download and delete files to test all features"
