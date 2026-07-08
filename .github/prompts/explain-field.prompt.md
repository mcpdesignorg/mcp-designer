---
name: explain-field
description: Describe when to use this prompt
argument-hint: "Name of label (e.g. server info -> repository)"
---

V UI se nachází v editoru prvek, který chci vysvětlit s ohledem na UI a MCPDS. Stručně popiš

1. co prvek dělá v UI
2. jaká má pravidla (constraints) a zda je UI prvek v souladu s MCPDS
3. popis prvku dle MCPDS (účel, význam, použití)

Vše stačí stručně. Pro MCPDS popis použij text z `@mcpds/spec` (typy a schéma).

Dále vždy

A. Navrhni stručný text (pár slov) jako hint (nápovědu UI)