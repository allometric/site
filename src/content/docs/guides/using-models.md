---
title: Using Models
description: Install, find, and apply allometric models in R.
---

This guide introduces the basic workflow for using the allometric models within
R. This relies on the R package `allometric`, which can ingest models into
usable prediction functions for analysis. Users can find models by browsing
the [model catalog](/models/) or [publication catalog](/publications/) to find
information about loading models from a particular source.

We will use the site index model defined in
[barnes_1962](/publications/barnes_1962) as an example.

## Install the package and models

```r
pak::pak("allometric/allometric")
```

The model distribution is downloaded separately from the `allometric` package:

```r
library(allometric)

install_models()
```

One can use `load_models()` to view all models in the corpus, but this is
generally discouraged because it can be slow and memory-intensive. Instead, we
encourage users to find models using the [model catalog](/models/) and load only
the models they need for analysis.

## Load an individual model and predict

Reading [barnes_1962](/publications/barnes_1962) in the model catalog, we can
see that the site index model can be loaded via

```r
mod <- load_model("barnes_1962", "hstix50")
```

Yielding the summary

```
Model Call: 
hstix50 = f(atb, hst) 
 
hstix50 [ft]: site index at 50 year base age
atb [year]: age of the tree at breast height
hst [ft]: total height of the stem 

Parameter Estimates: 
# A tibble: 1 × 3
      a      b       c
  <dbl>  <dbl>   <dbl>
1  22.6 0.0145 0.00116

Model Descriptors: 
# A tibble: 1 × 3
  taxa   region     country
  <list> <list>     <chr>  
1 <Taxa> <list [2]> US     

```

The response, `hstix50`, is the site index at 50 years base age, requires two
covariates: `atb` (age of the tree at breast height) and `hst` (total height of
the stem). The model can be used to predict site index for a 35 year old tree
with 100 feet of height by

```r
predict(mod, 125, 140)
```

Yielding a site index of 79.69 feet.

## Load multiple models and predict

Model sets are collections of models with the same prediction function but
different parameters. Typically, these are sets of species-specific models.
The [barrett_2006](/publications/barrett_2006) publication contains a set of
models for predicting the heights of trees based on their diameter. Load the
set via

```r
set <- load_set("barrett_2006", "hst")
```
The set contains one model for each species. Use `unnest_taxa()` to expand the
taxonomic descriptors into ordinary `genus` and `species` columns:

```r
models <- set |>
  unnest_taxa()
```

The bundled `fia_trees` data contains tree diameter and height measurements,
along with FIA species codes. Add the taxonomic names needed to join those
codes to the model set. The four species in this example are the species
represented in the bundled data:

```r
data(fia_trees)

fia_species <- tibble::tribble(
  ~SPCD, ~genus,        ~species,
      15, "Abies",      "concolor",
     122, "Pinus",      "ponderosa",
     202, "Pseudotsuga", "menziesii",
     263, "Tsuga",      "heterophylla"
)
```

Join the observations to their species-specific models and predict height. The
model expects diameter outside bark in centimeters, while `fia_trees` stores
diameter in inches. The observed height is converted from feet to meters so it
can be compared with the predictions:

```r
trees <- fia_trees |>
  dplyr::left_join(fia_species, by = "SPCD") |>
  dplyr::left_join(models, by = c("genus", "species")) |>
  dplyr::mutate(
    predicted_hst = predict(model, dsob = DIA * 2.54),
    observed_hst = HT * 0.3048
  )

trees |>
  dplyr::select(SPCD, genus, species, DIA, HT, predicted_hst, observed_hst) |>
  head()
```

Yielding:

```
  SPCD       genus   species  DIA  HT predicted_hst observed_hst
1  202 Pseudotsuga menziesii 27.1 152  38.39781 [m]      46.3296
2  202 Pseudotsuga menziesii 51.2 223  52.42604 [m]      67.9704
3  202 Pseudotsuga menziesii 33.8 217  43.47282 [m]      66.1416
4  202 Pseudotsuga menziesii 45.8 200  50.17554 [m]      60.9600
5  202 Pseudotsuga menziesii 27.3 148  38.56614 [m]      45.1104
6  202 Pseudotsuga menziesii  6.9  46  14.13254 [m]      14.0208
```

For a larger FIA dataset, replace `fia_species` with a species-code lookup
appropriate to that dataset. The important join keys are the `genus` and
`species` columns created by `unnest_taxa()`.
