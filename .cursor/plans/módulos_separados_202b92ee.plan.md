---
name: Módulos separados
overview: Separar velas, bobinas, correias, filtro de combustível e filtro de ar em módulos próprios de apresentação, e tirar o prefixo “Troca de” dos cards da home.
todos:
  - id: home-rename-split
    content: Renomear cards com “Troca de” e listar os cinco módulos novos em home.tsx
    status: completed
  - id: routes
    content: Criar as cinco telas placeholder, registrar no Stack e remover velas-bobinas-correias
    status: completed
  - id: readme
    content: Atualizar a lista de módulos no README
    status: completed
isProject: false
---

# Módulos separados na home

Os cinco itens novos seguem o mesmo padrão do placeholder atual em [`app/(app)/velas-bobinas-correias.tsx`](app/(app)/velas-bobinas-correias.tsx): card na home e tela com título e descrição via [`src/components/ModuleScreen.tsx`](src/components/ModuleScreen.tsx). Sem formulário, histórico, banco ou card em Avisos.

## Nomes na home

Em [`app/(app)/home.tsx`](app/(app)/home.tsx), os cards perdem o prefixo “Troca de”. Os títulos do stack em [`app/(app)/_layout.tsx`](app/(app)/_layout.tsx) já estão assim.

- Troca de óleo do motor → **Óleo do motor**
- Troca de óleo de câmbio → **Óleo de câmbio**
- Troca de arrefecimento → **Arrefecimento**

O módulo único “Velas, bobinas e correias” sai. No lugar, nesta ordem, depois dos três módulos já existentes:

- **Velas**
- **Bobinas** (grafia de “bombina”)
- **Correias**
- **Filtro de combustível**
- **Filtro de ar**

Avisos continua em largura total no topo. A grade de dois por linha passa a ter oito cards e fecha sem célula vazia.

## Rotas

Cada módulo ganha uma tela em `app/(app)/` e uma entrada no `Stack`:

- `velas.tsx`
- `bobinas.tsx`
- `correias.tsx`
- `filtro-combustivel.tsx`
- `filtro-ar.tsx`

A tela e a rota `velas-bobinas-correias` são removidas.

Ícones no mesmo formato já usado (`ios` / `android` / `web`), um por módulo: raio para velas, eletricidade para bobinas, ciclo para correias, bomba de combustível para o filtro de combustível e vento para o filtro de ar.

## README

Atualizar a tabela “O que dá para registrar hoje” e a seção “Ainda por vir” em [`README.md`](README.md) para listar os cinco módulos como texto de apresentação, no lugar da linha única de velas, bobinas e correias.
