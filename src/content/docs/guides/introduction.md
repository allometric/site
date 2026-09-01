---
title: Introduction
description: Design philosophy and principles of the `allometric` project.
---

Allometric models relate attributes of trees, such as diameter, height, and
crown size, to other attributes, such as biomass and volume. These models form
the basis of forest inventory systems worldwide, and many statistical products
quantifying forest health necessarily rely on them. The number of allometric
models is vast, and they are often tucked away in obscure reports or other
resources. The allometric project is a platform for archiving and using these
models in a robust and interoperable format. Models are declared using
publication YAML files, which are easy to read and write. For example, a
hypothetical model for estimating tree biomass from diameter and height might be

```{yaml}
- name: example_biomass_model
  type: fixed_effects
  response: { bt: "m3" }
  covariates: { dsob: "cm" }
  taxa:
    - family: Pinaceae
      genus: Pinus
      species: ponderosa
  parameters:
    a: 22.6
    b: 0.014482
    c: 0.001162
  prediction_function: "4.5 + a * exp((b - c * log(atb)) * (hst - 4.5))"
  description: |
    This model estimates tree biomass (bt) in cubic meters from diameter at
    breast height (dsob) in centimeters and tree height (hst) in meters for
    ponderosa pine trees.
```

Here, we declare a hypothetical biomass model for ponderosa pine trees,
define some information about its usage, and provide a prediction function for
estimating biomass from tree diameter and height. This approach yields a clear,
standardized format for allometric storage that can be ingested into other
processes.

## Accessing Models

Models stored within the system are viewable at the [models](/models) page. Each
model is associated with a publication, and publication rednerings can be viewed
at the [publications](/publications) page. Users can also programmatically
access the models through the
[`allometric`](http://github.com/allometric/allometric) R package, which
provides a suite of tools for working with allometric models and their outputs.
This website provides extensive documentation for the package
[here](/reference/r-allometric/).

## Contributing Models

The allometric project is entirely [open-source](https://github.com/allometric)
and contributing models is as simple as writing a text file. All models are
stored in the [`models`](https://github.com/allometric/models) repository,
allowing for transparent version control and collaboration. We encourage users
to contribute models to the repository, and we provide a
[contribution guide](/guides/contributing) to help users get started.

## The `allometric` Ecosystem

The allometric project is wide ranging, and relies on a suite of components to
properly store, validate, and use models. Most of these systems are not
necessary for routine use of models, but they are essential for contributing new
models to the repository. These components include:

1. The [`models`](https://github.com/allometric/models) repository, which stores
   allometric in highly structured YAML files.
2. The [`orc`](https://github.com/allometric/orc) validator, which ensures
   models are properly specified with a uniform schema.
3. The [`allometric`](http://github.com/allometric/allometric) R Package, which
   provides analysis tools for working with allometric models and their outputs.
4. The [`allometric` website](https://allometric.org), which provides a user
   interface for exploring models and publications, as well as documentation for
   the above software.

