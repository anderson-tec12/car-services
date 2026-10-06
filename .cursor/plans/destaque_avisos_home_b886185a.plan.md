---
name: Destaque avisos home
overview: Na tela de módulos, o cartão de Avisos passa a ocupar as duas colunas e ganha um fundo amarelo suave, usando a cor primária do tema.
todos:
  - id: full-width-avisos
    content: Renderizar Avisos em linha própria de 100% e manter os outros módulos no grid de duas colunas
    status: completed
  - id: soft-highlight
    content: Aplicar fundo amarelo suave (primary a ~12% de opacidade) só no cartão de Avisos
    status: completed
isProject: false
---

# Avisos em largura total com destaque leve

O grid em [`app/(app)/home.tsx`](app/(app)/home.tsx) agrupa `MODULES` de dois em dois. Avisos fica na célula esquerda da primeira linha, ao lado de “Troca de óleo do motor”.

## Layout

- Separar Avisos dos demais módulos.
- Renderizar Avisos numa linha própria com `width: 100%`, acima do grid.
- Os quatro módulos restantes continuam em duas linhas de duas colunas, como hoje.

```mermaid
flowchart TB
  avisos["Avisos — largura total + fundo suave"]
  row1["Óleo do motor | Óleo de câmbio"]
  row2["Arrefecimento | Velas, bobinas e correias"]
  avisos --> row1 --> row2
```

## Destaque

- Fundo `rgba(245, 196, 0, 0.12)`, derivado de `theme.colors.primary` (`#F5C400`) em [`src/theme/theme.ts`](src/theme/theme.ts).
- Manter ícone, título, descrição, borda inferior e o `Link` para `/avisos`.
- Sem borda extra nem mudança de tipografia, para o destaque continuar discreto no fundo `#121212`.
