---
name: README do projeto
overview: Escrever um README em português na raiz do repositório que explique por que o Car Services existe, com uma ilustração de abertura e capturas reais das telas principais.
todos:
  - id: cover
    content: Gerar a ilustração de abertura em docs/images/capa.png nas cores do app
    status: completed
  - id: screenshots
    content: Subir o Expo Web, percorrer cadastro, módulos, veículos, óleo, arrefecimento e avisos, e salvar as capturas
    status: completed
  - id: readme
    content: Escrever README.md em português com o porquê, as imagens legendadas, o que já funciona e como rodar
    status: completed
isProject: false
---

# README do Car Services

Criar [`README.md`](README.md) na raiz, em português, e salvar as imagens em [`docs/images/`](docs/images/). O texto parte do que o app já faz: um caderno de manutenção no celular, sem conta e sem nuvem.

## Por que o projeto existe

O README abre com o motivo, não com a stack. O histórico de óleo, filtro e arrefecimento costuma ficar em recibo de papel, mensagem de oficina ou memória. Quando o carro troca de mão — ou quando a próxima troca vence — esse registro some. O Car Services guarda isso no aparelho de quem dirige: um veículo ativo por vez (marca, modelo e placa), data, quilometragem e fotos da troca, com aviso da próxima data.

Dados em SQLite local (`car-services.db`), fotos no armazenamento do app. Sem login e sem sincronização.

## Imagens

- **Ilustração de abertura** gerada para a marca do app: fundo `#121212`, amarelo `#F5C400`, carro e a ideia de histórico de manutenção no celular. Arquivo: `docs/images/capa.png`. O ícone real em [`assets/icon.png`](assets/icon.png) entra ao lado do título.
- **Capturas reais** do app web, em viewport de celular (cerca de 390×844), depois de cadastrar um veículo de exemplo e pelo menos uma troca de óleo e uma de arrefecimento, para a tela de avisos não ficar vazia:
  - `cadastro.png` — formulário inicial em [`app/index.tsx`](app/index.tsx)
  - `modulos.png` — grade em [`app/(app)/home.tsx`](app/(app)/home.tsx)
  - `veiculos.png` — troca de veículo pela placa ([`src/components/PlateHeader.tsx`](src/components/PlateHeader.tsx), [`app/vehicles.tsx`](app/vehicles.tsx))
  - `oleo-motor.png` — registro com data, km, filtro, marca, viscosidade, tipo e fotos ([`app/(app)/oleo-motor.tsx`](app/(app)/oleo-motor.tsx))
  - `arrefecimento.png` — registro com flush e fotos ([`app/(app)/arrefecimento.tsx`](app/(app)/arrefecimento.tsx))
  - `avisos.png` — próxima troca de óleo (10.000 km ou 12 meses) e de arrefecimento (30.000 km ou 18 meses) ([`app/(app)/avisos.tsx`](app/(app)/avisos.tsx))

As capturas saem do Expo Web (`npx expo start --web`) com um navegador headless, no fluxo real da interface. Cada imagem no README leva uma legenda curta.

## Estrutura do README

1. Título, ícone e ilustração.
2. **Por que existe** — o problema do histórico perdido e a decisão de ficar offline.
3. **Como funciona** — cadastro obrigatório do primeiro veículo, placa no topo, um veículo ativo, módulos por tipo de serviço.
4. **O que dá para registrar hoje** — óleo do motor e arrefecimento, com os intervalos acima; avisos de próxima data e atraso por data.
5. **Telas** — as seis capturas.
6. **Ainda em texto** — óleo de câmbio e velas, bobinas e correias só têm a descrição em [`src/components/ModuleScreen.tsx`](src/components/ModuleScreen.tsx). O README deixa isso explícito.
7. **Stack** — Expo SDK 57, Expo Router, TypeScript, styled-components, expo-sqlite, expo-image-picker, expo-file-system. Tema escuro e amarelo em [`src/theme/theme.ts`](src/theme/theme.ts).
8. **Como rodar** — `npm install`, `npx expo start` (Android, iOS e web). APK interno pelo perfil `preview` em [`eas.json`](eas.json): `npx eas-cli build --platform android --profile preview`.
9. **Onde está o código** — `app/` (rotas), `src/db/`, `src/vehicles/`, `src/components/`, `src/theme/`.

O `package.json` marca o projeto como `private`. O README não inventa licença.

## Fora deste trabalho

Não alterar telas, banco ou dependências. Não criar commit.