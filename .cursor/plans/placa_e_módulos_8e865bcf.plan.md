---
name: Placa e módulos
overview: Descer um pouco a placa no header e transformar a lista de módulos numa grade de duas colunas, com ícone nativo e só uma borda inferior em cada opção.
todos:
  - id: lower-plate
    content: Aumentar o padding superior do PlateHeader em 16px além do inset
    status: completed
  - id: install-symbols
    content: Instalar expo-symbols com npx expo install
    status: completed
  - id: modules-grid
    content: Reescrever a home em grade de duas colunas com ícone e borda inferior
    status: completed
isProject: false
---

# Placa mais baixa e módulos em duas colunas

## Placa

Em [`src/components/PlateHeader.tsx`](src/components/PlateHeader.tsx), o topo do header usa `Math.max(insets.top, 16)`. No celular isso encosta a placa na barra de status.

Trocar para `insets.top + theme.spacing.md` (16px a mais abaixo da área segura). O restante do header (borda inferior, botão da placa) permanece.

## Módulos

A lista está em [`app/(app)/home.tsx`](app/(app)/home.tsx): cada item é um card de largura cheia, com borda nos quatro lados, título e descrição.

Passar para uma grade de duas colunas:

- Agrupar `MODULES` em linhas de dois. Cada célula com `width: 50%` e `alignItems: 'stretch'`, para as bordas da mesma linha ficarem alinhadas. O quinto item (velas) fica só na coluna da esquerda, com metade da largura.
- Em cada célula: ícone em cima, título e a descrição atual embaixo.
- Tirar fundo, raio e borda completa do card. Fica só `border-bottom-width: 1px` com a cor `#2a2a2a`, a mesma do header.
- Título e subtítulo da tela (“Módulos”) continuam em largura cheia, acima da grade.

Ícones com `SymbolView` de `expo-symbols` (módulo oficial do SDK 57, incluso no Expo Go). Cor `theme.colors.primary`, tamanho 28. Nomes por plataforma:

- Avisos: iOS `bell`, Android/web `notifications`
- Óleo do motor: iOS `drop.fill`, Android/web `oil_barrel`
- Óleo de câmbio: iOS `gearshape`, Android/web `settings`
- Arrefecimento: iOS `thermometer.medium`, Android/web `device_thermostat`
- Velas, bobinas e correias: iOS `bolt.fill`, Android/web `bolt`

Instalar com `npx expo install expo-symbols` (não há `bun.lock` no projeto).

## Verificação

Rodar `npx tsc --noEmit` e `npx expo lint`. Conferir no app que a placa desceu e que a home mostra duas colunas, ícone e linha inferior em cada opção.