#!/bin/bash
# 该脚本由 Cloudflare Pages 构建时自动执行，用于将环境变量注入到 config.js
echo "window.SUPABASE_CONFIG = {" > frontend/js/config.js
echo "  url: '${SUPABASE_URL}'," >> frontend/js/config.js
echo "  anonKey: '${SUPABASE_ANON_KEY}'" >> frontend/js/config.js
echo "};" >> frontend/js/config.js
