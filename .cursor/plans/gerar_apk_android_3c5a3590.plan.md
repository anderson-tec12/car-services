---
name: Gerar APK Android
overview: Dá para gerar um APK. Neste Mac não há JDK nem Android SDK, então o caminho viável é um build na nuvem com EAS (Expo SDK 57), com perfil que produz APK instalável.
todos:
  - id: config-apk
    content: Adicionar android.package em app.json e criar eas.json com perfil preview (buildType apk)
    status: completed
  - id: eas-build
    content: Fazer login no EAS se necessário e rodar o build Android do perfil preview
    status: completed
  - id: download-apk
    content: Baixar o APK gerado e informar o caminho e o link
    status: completed
isProject: false
---

# Gerar APK do Car Services

Sim. O app é Expo SDK 57 ([package.json](package.json)) e ainda não tem pasta `android/` nem [eas.json](eas.json). Compilar na máquina não é viável agora: não há Java nem Android SDK. O APK sai pelo EAS Build na nuvem, que é o fluxo previsto no projeto.

O artefato será um **APK de instalação direta** (celular ou emulador). O formato da Play Store é AAB; este plano não gera AAB.

## Ajustes no projeto

- Em [app.json](app.json), definir o identificador Android `android.package` como `com.devtech.carservices` (obrigatório para o build; ainda não existe).
- Criar [eas.json](eas.json) com um perfil `preview`:

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

`buildType: "apk"` faz o Gradle usar `:app:assembleRelease`. O repositório está limpo em `main`, então o EAS envia o código atual.

## Build

Comando (npm, porque existe `package-lock.json`):

```bash
npx eas-cli@latest build -p android --profile preview
```

Na primeira vez o CLI pede login na conta Expo (navegador) e cria o projeto e o keystore Android. Sem essa conta o build não começa. A fila gratuita costuma levar vários minutos.

Quando terminar, baixar o `.apk` para a pasta do projeto e informar o caminho local e o link de download.
