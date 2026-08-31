---
title: Getting Started
description: Install the allometric package and load models for prediction.
---

The [`allometric` R package](https://github.com/allometric/allometric) provides
tools for predicting tree attributes from the models stored in the
[`allometric/models`](https://github.com/allometric/models) repository. Install
it from GitHub, install the compiled model distribution, and load the models:

```r
devtools::install_github("allometric/allometric")

library(allometric)
install_models()          # downloads the compiled v4 model distribution
allometric_models <- load_models()
```

`load_models()` returns a table of every model in the distribution, which you
can filter by publication, model type, country, or region. See [The allometric
Package](/reference/r-allometric/) for a full walkthrough of finding and
predicting with models.
