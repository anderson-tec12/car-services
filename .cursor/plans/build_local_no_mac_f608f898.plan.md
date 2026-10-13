---
name: Build local no Mac
overview: Sim, o Car Services pode ser compilado neste Mac. Hoje falta o Android SDK (e o Xcode, se for iOS). O caminho mais direto para um APK instalável é o perfil preview que o projeto já usa.
todos:
  - id: install-android-studio
    content: Instalar Android Studio e o Android SDK neste Mac
    status: completed
  - id: local-apk
    content: Gerar o APK com npx eas-cli build --platform android --profile preview --local
    status: completed
isProject: false
---

# Build local neste Mac

Sim. O app é Expo SDK 57 em modo gerenciado: não existem pastas `android/` nem `ios/` no repositório (estão no [`.gitignore`](.gitignore)), e o perfil [`preview`](eas.json) já gera APK.

Neste Mac ainda não dá para compilar agora. Não há Java, Android SDK, Android Studio, Xcode nem EAS CLI instalados.

## Android (APK para instalar no celular)

1. Instalar o [Android Studio](https://developer.android.com/studio) e, no SDK Manager, o Android SDK.
2. Na raiz do projeto:

```bash
npx eas-cli build --platform android --profile preview --local
```

Esse comando usa o mesmo perfil de [`eas.json`](eas.json) (`buildType: apk`, distribuição interna), pede login na conta Expo (`anderson.tec1212`) e deixa o `.apk` na pasta do projeto. As pastas nativas são geradas só durante o build e continuam fora do git.

Para testar no emulador ou num aparelho com depuração USB, depois do Android Studio:

```bash
npx expo run:android
```

Isso instala um build de debug e sobe o Metro. Mudança só de JavaScript depois disso usa `npx expo start`.

## iOS

Precisa do Xcode (App Store). Aí:

```bash
npx expo run:ios
```

Simulador não exige conta paga. iPhone físico exige assinatura da Apple.

## O que não muda no código

Nenhuma alteração em `app.json`, `eas.json` ou dependências é necessária para esse fluxo.
