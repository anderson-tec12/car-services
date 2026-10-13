---
name: Script APK local
overview: Adicionar um script no package.json que gera o APK localmente dentro de `apks/`, e ignorar essa pasta no git.
todos:
  - id: script-apk
    content: Adicionar o script apk em package.json com saída em apks/
    status: completed
  - id: gitignore-apks
    content: Ignorar /apks/ e *.apk no .gitignore
    status: completed
isProject: false
---

# Script de APK em `apks/`

O perfil [`preview`](eas.json) já gera APK (`buildType: apk`). Hoje `eas build --local` deixa o arquivo na raiz do repositório (há `build-1791467821495.apk` e `car-services-1.0.0.apk` soltos). A flag `--output` do EAS CLI só vale com `--local` e recebe um caminho de arquivo.

## Alterações

- Em [`package.json`](package.json), script `apk`:

```bash
mkdir -p apks && npx eas-cli@latest build --platform android --profile preview --local --output "apks/car-services-$(node -p "require('./package.json').version").apk"
```

Com a versão atual, o arquivo sai em `apks/car-services-1.0.0.apk`. Um novo build da mesma versão substitui o anterior. Continua pedindo login Expo e o Android SDK, como o build local que já foi usado.

- Em [`.gitignore`](.gitignore):

```
/apks/
*.apk
```

`/apks/` tira a pasta do git. `*.apk` também cobre os APKs que já estão na raiz, para não serem commitados por engano.

Uso: `npm run apk`.
