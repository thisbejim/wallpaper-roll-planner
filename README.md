# RollReady Wallpaper Roll Planner

**Use it here: https://thisbejim.github.io/wallpaper-roll-planner/**

RollReady is a free wallpaper roll calculator that plans full-width drops instead of guessing from square footage. It accounts for pattern repeat, match type, trim, roll yield, full-height openings and spare rolls, then gives you a cut map and a shopping list.

## Why it exists

Wallpaper estimates are easy to get wrong: two calculators can disagree because one treats paper as area while the other counts the drops that can actually be cut from a roll. RollReady makes the assumptions visible so a homeowner can check the label, understand the waste and order from one dye lot with confidence.

## Privacy

The app is a static site. Calculations run locally in your browser; measurements are not uploaded, logged or tracked. There is no account, advertising, analytics, payment or API key.

## Features

- Imperial and metric measurements with sensible common-roll defaults.
- Random, straight-match and half-drop pattern planning.
- Trim allowance, full-height opening handling and optional spare rolls.
- Roll-by-roll cut map that shows how many drops fit on each roll.
- Optional cost estimate in USD, AUD, CAD, EUR or GBP.
- Copy, download, print and shareable-link actions.
- Keyboard-friendly, responsive interface with no runtime network dependency.

## Development

Requires Node.js 20 or newer.

```bash
npm test
npm run build
```

`npm run build` copies the static app into `dist/` and checks that the production URL and calculator mount point are present. The source is deliberately dependency-free JavaScript, HTML and CSS.

## Deployment

`.github/workflows/pages.yml` runs the tests, builds `dist/`, and deploys it to GitHub Pages whenever `main` changes. The repository's Pages source is the GitHub Actions workflow.

## Method notes

The calculator uses the drop-and-roll method:

1. Drops needed = papered wall run ÷ roll width, rounded up.
2. Cut length = wall height + trim, rounded to a whole pattern repeat for matched paper.
3. Drops per roll = roll length ÷ cut length, rounded down.
4. Rolls to buy = drops needed ÷ drops per roll, rounded up, plus the spare rolls selected.

Ordinary doors and windows are not automatically subtracted: they usually still require full drops around and above the opening. The openings field is for a genuine floor-to-ceiling gap.

This is a planning estimate, not a substitute for a manufacturer's yield instructions or a decorator's judgement on murals, horizontal hanging, out-of-square walls or unusual pattern layouts.

## License

MIT. See [LICENSE](LICENSE).
