# Car Services

<p align="center">
  <img src="assets/icon.png" alt="Ícone do Car Services" width="96" height="96" />
</p>

<p align="center">
  <img src="docs/images/capa.png" alt="Ilustração: carro e checklist de manutenção no celular" width="720" />
</p>

**Car Services** é um app mobile para registrar a manutenção do seu carro no próprio aparelho — sem conta, sem nuvem e sem depender do recibo da oficina.

## Por que existe

O histórico de óleo, filtro e arrefecimento costuma ficar espalhado: recibo de papel, mensagem no WhatsApp da oficina ou só na memória. Quando o carro troca de mão, ou quando a próxima troca vence, esse registro some.

O Car Services guarda isso onde quem dirige consegue olhar: data, quilometragem, detalhes da troca e fotos. Os dados ficam no SQLite local (`car-services.db`) e as fotos no armazenamento do app. Sem login e sem sincronização.

## Como funciona

1. No primeiro uso, cadastre marca, modelo e placa.
2. A placa do veículo ativo fica no topo; toque nela para trocar ou cadastrar outro.
3. Na home, escolha o módulo do serviço que quer acompanhar.
4. Em óleos, arrefecimento, velas, bobinas, correias, filtros, suspensão e freios, registre a troca e veja o histórico.
5. Em Avisos, confira a próxima data e quilometragem sugeridas.

Um veículo fica ativo por vez. Os registros de manutenção ficam ligados a esse veículo.

## O que dá para registrar hoje

| Módulo | Situação | Intervalo usado nos avisos |
| --- | --- | --- |
| **Óleo do motor** | Completo: data, km, filtro, marca, viscosidade, tipo e até 2 fotos | 10.000 km ou 12 meses |
| **Óleo de câmbio** | Completo: data, km, marca e até 2 fotos | 40.000 km ou 24 meses |
| **Arrefecimento** | Completo: data, km, flush e até 2 fotos | 30.000 km ou 18 meses |
| **Avisos** | Próxima troca e status por data (em dia ou atrasado) | Calculado a partir do último registro |
| **Velas** | Completo: data, km e até 2 fotos | 30.000 km ou 24 meses |
| **Bobinas** | Completo: data, km e até 2 fotos | 60.000 km ou 48 meses |
| **Correias** | Completo: dentada e acessórios com data, km e até 2 fotos cada | Dentada 60.000 km ou 60 meses; acessórios 40.000 km ou 48 meses |
| **Filtro de combustível** | Completo: data, km e até 2 fotos | 20.000 km ou 12 meses |
| **Filtro de ar** | Completo: motor e cabine com data, km e até 2 fotos cada | Motor 15.000 km ou 12 meses; cabine 10.000 km ou 12 meses |
| **Suspensão dianteira** | Completo: amortecedor, mola, batente, coifa, coxim, bandeja, buchas, pivô, bieleta, barra e rolamento com data, km e até 2 fotos cada | Por peça (ex.: amortecedor 60.000 km ou 48 meses) |
| **Suspensão traseira** | Completo: amortecedor, mola, batente, coifa, coxim, bucha do eixo, braço, bieleta, barra, rolamento e feixe com data, km e até 2 fotos cada | Por peça (ex.: amortecedor 60.000 km ou 48 meses) |
| **Freios** | Completo: pastilhas, discos, lona, tambor, fluido, flexível, pinça, cilindros, servofreio e cabo com data, km e até 2 fotos cada | Por peça (ex.: pastilha dianteira 20.000 km ou 12 meses) |

## Telas

### Cadastro do primeiro veículo

O app só libera a home depois do primeiro veículo.

![Tela de cadastro do veículo](docs/images/cadastro.png)

### Módulos

Grade com os módulos de manutenção.

![Tela de módulos](docs/images/modulos.png)

### Veículos

Lista para ativar um carro ou cadastrar outro, aberta pela placa no topo.

![Tela de veículos](docs/images/veiculos.png)

### Óleo do motor

Formulário de troca com histórico por data e quilometragem.

![Tela de troca de óleo do motor](docs/images/oleo-motor.png)

### Óleo de câmbio

Registro de troca de óleo de câmbio, com marca e fotos.

![Tela de óleo de câmbio](docs/images/oleo-cambio.png)

### Arrefecimento

Registro de troca de arrefecimento, com opção de flush e fotos.

![Tela de arrefecimento](docs/images/arrefecimento.png)

### Velas

Registro de troca de velas com data, quilometragem e fotos.

![Tela de velas](docs/images/velas.png)

### Bobinas

Registro de troca de bobinas com data, quilometragem e fotos.

![Tela de bobinas](docs/images/bobinas.png)

### Correias

Abas para correia dentada e de acessórios, cada uma com histórico próprio.

![Tela de correias](docs/images/correias.png)

### Filtro de combustível

Registro de troca do filtro de combustível com data, quilometragem e fotos.

![Tela de filtro de combustível](docs/images/filtro-combustivel.png)

### Filtro de ar

Abas para filtro do motor e de cabine, cada uma com histórico próprio.

![Tela de filtro de ar](docs/images/filtro-ar.png)

### Suspensão dianteira

Abas por peça da suspensão dianteira, com registro e histórico.

![Tela de suspensão dianteira](docs/images/suspensao-dianteira.png)

### Suspensão traseira

Abas por peça da suspensão traseira, com registro e histórico.

![Tela de suspensão traseira](docs/images/suspensao-traseira.png)

### Freios

Abas por peça do sistema de freios, com registro e histórico.

![Tela de freios](docs/images/freios.png)

### Avisos

Resumo da próxima troca de cada módulo do veículo ativo.

![Tela de avisos](docs/images/avisos.png)

## Stack

- **Expo SDK 57** + React Native + TypeScript
- **Expo Router** para navegação
- **styled-components** com tema escuro e amarelo (`#F5C400` em `src/theme/theme.ts`)
- **expo-sqlite** para o banco local
- **expo-image-picker** e **expo-file-system** para fotos das trocas
- **EAS** com perfil `preview` para gerar APK Android interno

## Como rodar

Requisito: **Node.js ≥ 20.19.4** (recomendado: Node 22 LTS).

```bash
npm install
npx expo start
```

No menu do Expo, abra no Android, iOS ou web.

Para gerar um APK de distribuição interna:

```bash
npx eas-cli@latest build --platform android --profile preview
```

O perfil está em [`eas.json`](eas.json).

> Na web, o SQLite precisa de suporte a `.wasm` e dos headers COOP/COEP. O projeto já inclui isso em [`metro.config.js`](metro.config.js).

## Como atualizar os prints

As capturas em [`docs/images/`](docs/images/) saem do Expo Web em viewport de celular (390×844), pelo script [`scripts/capture-readme-screenshots.mjs`](scripts/capture-readme-screenshots.mjs).

Playwright não faz parte das dependências do app. Instale só para gerar os prints:

```bash
npm install -D playwright
npx playwright install chromium
```

Com o Metro rodando em `http://localhost:8081`:

```bash
npx expo start --web
# em outro terminal, com o Metro já aberto:
node scripts/capture-readme-screenshots.mjs
```

O script cadastra um veículo de exemplo, registra trocas e grava os PNGs. Para acrescentar uma tela simples no script (exemplo: velas):

```js
await page.goto(`${baseURL}/velas`, { waitUntil: 'domcontentloaded' });
await waitForText(page, 'Velas');
await fillByPlaceholder(page, 'Ex.: 45000', '38000');
await tapText(page, 'Salvar troca');
await page.getByText(/38.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
await screenshot(page, 'velas.png');
```

No README, a imagem correspondente fica assim:

```md
![Tela de velas](docs/images/velas.png)
```

Telas com abas (correias, filtro de ar, suspensão, freios) usam o mesmo fluxo depois de selecionar a primeira peça.

## Onde está o código

| Pasta | Conteúdo |
| --- | --- |
| `app/` | Rotas e telas (Expo Router) |
| `src/db/` | Schema SQLite, veículos, trocas de manutenção e fotos |
| `src/vehicles/` | Contexto do veículo ativo |
| `src/components/` | Formulário, header da placa e telas-placeholder |
| `src/theme/` | Cores, espaçamento e styled-components |
| `docs/images/` | Imagens usadas neste README |
| `assets/` | Ícone, splash e adaptive icon |

## Ainda por vir

Os módulos de manutenção principais já estão com registro e avisos. Próximos passos naturais: lembretes por notificação e exportação do histórico.
