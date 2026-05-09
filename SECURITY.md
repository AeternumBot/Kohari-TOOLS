# 🔒 Seguridad - Manejo de Credenciales

## ⚠️ IMPORTANTE: API Keys y Credenciales

**NUNCA** subas credenciales reales a GitHub. Esto incluye:
- API Keys (Gemini, Google, etc.)
- Tokens de autenticación
- Passwords
- Cualquier credencial secreta

## 📋 Dónde se guardan las credenciales en Kohari ORC

### LocalStorage (Navegador - SEGURO ✓)
Las credenciales se guardan **localmente en tu navegador** usando `localStorage`:
```javascript
localStorage.setItem('kohariORC_apiKey', apiKey);
```

**Ventaja**: No se sincroniza con GitHub
**Desventaja**: Se pierde si limpias caché del navegador

### Archivos .env (Para futuros desarrollos - CUIDADO ⚠️)
Si en el futuro agregas soporte para archivos `.env`:

```bash
# ❌ MALO - Nunca hagas esto:
.env                    # Contiene credenciales reales

# ✅ BUENO:
.env.local              # Gitignored - credenciales reales del dev
.env.example            # Gittracked - estructura sin valores
```

## 🔐 Protocolo de Seguridad

### Para Usuarios Finales
1. Tu API Key se guarda **solo en el navegador** (localStorage)
2. No se comparte con el servidor de Kohari
3. No se sube a GitHub

### Para Desarrolladores
1. **Nunca** hagas commit de `.env` con credenciales reales
2. Usa `.env.example` como plantilla
3. Agrega nuevos archivos de credenciales a `.gitignore`
4. Revisa antes de cada push: `git status`

### Verificar que .gitignore está funcionando
```bash
# Ver qué archivos serían ignorados
git status --ignored

# Confirmar que tus credenciales no están staged
git diff --cached | grep -i "api\|key\|token\|secret"
```

## 🛡️ Si accidentalmente subiste credenciales

1. **Invalida la credencial INMEDIATAMENTE** en el proveedor (ej: Google Cloud Console)
2. Genera una nueva credencial
3. Reescribe el historio de git (si es posible):
   ```bash
   git filter-branch --tree-filter 'rm -f .env' HEAD
   git push --force
   ```
4. Avisa al equipo sobre el incidente

## 📚 Referencias
- [GitHub: Managing Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Google API Security](https://cloud.google.com/docs/authentication/api-keys)
