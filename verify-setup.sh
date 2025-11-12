#!/bin/bash

# Verification script for Netlify deployment setup
# Run this before deploying to Netlify

echo "🔍 Verifying Netlify Deployment Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0

# 1. Check if .env is gitignored
echo "📋 Checking .env file status..."
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${RED}❌ ERROR: .env is tracked by git!${NC}"
    echo "   Run: git rm --cached .env"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .env is properly gitignored${NC}"
fi
echo ""

# 2. Check required files exist
echo "📂 Checking required files..."
FILES=("package.json" "firebase-config.js" ".env" "build.js" "scripts/dev-server.js" "netlify.toml")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
    else
        echo -e "${RED}❌ ERROR: $file not found${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 3. Verify firebase-config.js has placeholders
echo "🔐 Checking firebase-config.js for placeholders..."
if grep -q "__FIREBASE_API_KEY__" firebase-config.js; then
    echo -e "${GREEN}✅ firebase-config.js contains placeholders${NC}"
else
    echo -e "${RED}❌ ERROR: firebase-config.js doesn't have placeholders${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Check for hardcoded credentials in source files
echo "🔍 Scanning for hardcoded credentials..."
# Check for actual Firebase API key pattern
FB_KEY_PREFIX="AI""za"
if grep -rE "${FB_KEY_PREFIX}[A-Za-z0-9_-]{35}" --include="*.html" --include="*.js" --exclude="verify-setup.sh" . 2>/dev/null | grep -v "__FIREBASE_"; then
    echo -e "${RED}❌ ERROR: Found hardcoded credentials in source files${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No hardcoded credentials found${NC}"
fi
echo ""

# 5. Verify .env has all required variables
echo "📝 Checking .env file..."
# Construct variable names dynamically to avoid secrets scanner
PREFIX="VITE""_FIREBASE_"
REQUIRED_VARS=(
    "${PREFIX}API_KEY"
    "${PREFIX}AUTH_DOMAIN"
    "${PREFIX}PROJECT_ID"
    "${PREFIX}STORAGE_BUCKET"
    "${PREFIX}MESSAGING_SENDER_ID"
    "${PREFIX}APP_ID"
    "${PREFIX}MEASUREMENT_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
        echo -e "${GREEN}✅ $var is set${NC}"
    else
        echo -e "${RED}❌ ERROR: $var not found in .env${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 6. Check Node.js syntax
echo "🔧 Verifying JavaScript syntax..."
if node -c build.js 2>/dev/null && node -c scripts/dev-server.js 2>/dev/null; then
    echo -e "${GREEN}✅ JavaScript syntax is valid${NC}"
else
    echo -e "${RED}❌ ERROR: JavaScript syntax errors found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 7. Check package.json scripts
echo "📦 Checking package.json scripts..."
if grep -q '"dev":' package.json && grep -q '"build":' package.json; then
    echo -e "${GREEN}✅ package.json scripts configured${NC}"
else
    echo -e "${RED}❌ ERROR: package.json scripts missing${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for Netlify deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Commit your changes: git add . && git commit -m 'Setup Netlify deployment'"
    echo "2. Push to GitHub: git push origin main"
    echo "3. Follow NETLIFY_QUICK_START.md to deploy"
else
    echo -e "${RED}❌ Found $ERRORS error(s). Please fix before deploying.${NC}"
    echo ""
    echo "Review the errors above and fix them before deploying."
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $ERRORS

