# Structured Products Simulator

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Monte Carlo](https://img.shields.io/badge/Pricing-Monte%20Carlo-534AB7?style=flat)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat)

> Simulateur interactif de produits structurés avec pricing Monte Carlo (5 000 trajectoires), génération automatique de term sheet et analyse du profil risque/rendement.

---

## Aperçu

Cet outil permet de **structurer, paramétrer et pricer** quatre grandes familles de produits structurés sur panier multi-sous-jacents, avec visualisation de la distribution des payoffs et indicateurs de risque (VaR, CVaR).

| Fonctionnalité | Détail |
|---|---|
| Types de produits | Phoenix Autocall · Capital Garanti · Reverse Convertible · Booster |
| Sous-jacents | Indices (CAC 40, EuroStoxx 50, S&P 500...) · Actions (TTE, BNP, LVMH...) · ETF |
| Méthode panier | Worst-of · Best-of · Moyenne pondérée |
| Pricing | Monte Carlo — 5 000 simulations GBM |
| Outputs | VAN espérée · VaR 95% · CVaR 95% · Prob. rappel · Distribution des payoffs |

---

## Produits modélisés

### Phoenix Autocall
Produit à rappel automatique conditionnel. À chaque date d'observation, si le panier est au-dessus de la **barrière de rappel**, le produit est remboursé avec les coupons accumulés. Un **effet mémoire** optionnel permet de récupérer les coupons non versés lors des périodes défavorables.

**Payoff à maturité (non rappelé) :**
```
Si S_T ≥ B_capital  →  Nominal × (1 + Σ coupons perçus)
Si S_T < B_capital  →  Nominal × (S_T / S_0) × (1 + Σ coupons perçus)
```

### Capital Garanti + Participation
Structure obligation zéro-coupon + call vanille. Le capital est garanti à maturité (100% ou partiellement), avec une participation à la hausse du sous-jacent, éventuellement plafonnée.

```
Payoff = Nominal × [Garantie + Participation × max(0, S_T/S_0 - Strike)]  capped à Cap
```

### Reverse Convertible
Coupon fixe élevé garanti en échange d'un risque de remboursement en-dessous du nominal si le sous-jacent franchit la barrière de protection à maturité.

```
Si S_T ≥ B_protection  →  Nominal + Coupon total
Si S_T < B_protection  →  Nominal × (S_T / S_0) + Coupon total
```

### Booster / Bonus Certificate
Participation amplifiée à la hausse avec niveau bonus minimum garanti, à condition que le sous-jacent ne touche jamais la barrière désactivante (knock-in) pendant la vie du produit.

```
Si barrière non touchée :
  S_T ≥ 100%  →  min(1 + Levier × (S_T/S_0 - 1), Cap)
  S_T < 100%  →  Bonus
Si barrière touchée  →  Nominal × S_T / S_0
```

---

## Modèle de pricing — Mouvement Brownien Géométrique

Chaque sous-jacent suit un GBM sous la mesure risque-neutre :

```
dS = r·S·dt + σ·S·dW

Discrétisation (schéma d'Euler-Maruyama) :
S_{t+dt} = S_t × exp[(r - σ²/2)·dt + σ·√dt·Z]

où Z ~ N(0,1)  (Box-Muller)
```

Pour un panier **worst-of** :  `Basket_t = min(S¹_t/S¹_0, S²_t/S²_0, ..., Sⁿ_t/Sⁿ_0)`

Les résultats sont actualisés au taux sans risque `r` :  `VAN = E[Payoff_T × e^{-rT}]`

---

## Indicateurs de risque calculés

| Indicateur | Formule |
|---|---|
| VAN espérée | `E[Payoff] = (1/N) × Σ Payoff_i` |
| VaR 95% | 5ème percentile de la distribution des payoffs |
| CVaR 95% | Moyenne des payoffs sous le 5ème percentile |
| Prob. capital préservé | `P(Payoff ≥ Nominal)` |
| Prob. perte > 10% | `P(Payoff < 0.9 × Nominal)` |
| Prob. rappel anticipé | `P(rappel avant maturité)` — Phoenix uniquement |

---

## Installation & lancement

```bash
# Cloner le repo
git clone https://github.com/boriskbr27-web/structured-products-simulator.git
cd structured-products-simulator

# Installer les dépendances
npx create-react-app .
# ou dans un projet React existant, copier structured_products_simulator.jsx dans /src

# Lancer
npm start
```

**Dépendances :** React 18+ uniquement (pas de librairie externe de pricing).

---

## Utilisation

1. **Sélectionner** le type de produit (onglet "Type de produit")
2. **Configurer** les sous-jacents et les paramètres via les sliders (onglet "Paramètres")
3. **Générer** la term sheet automatique (onglet "Term sheet")
4. **Lancer** la simulation Monte Carlo et analyser les résultats (onglet "Pricing MC")

---

## Projets associés

| Projet | Description |
|---|---|
| `phoenix-autocall-pricer` | *(à venir)* Pricer Python avec Greeks et surface de volatilité |
| `brvm-portfolio-analysis` | *(à venir)* Analyse quantitative de portefeuille BRVM |
| `mt5-trading-ea` | *(à venir)* Expert Advisor MetaTrader 5 — stratégie mean reversion |

---

## Auteur

**Jean-Marie Boris KABORÉ**  
MBA Trading & Finance de Marché — ESLSCA Business School Paris (Promo 2026)  
Middle/Back Office Investment Officer — Gresham Banque Privée (Groupe APICIL)  
Chargé de cours Dérivés Financiers — ESLSCA

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profil-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/)

---

*Projet académique et pédagogique. Les simulations ne constituent pas un conseil en investissement.*
