---
title: Introduction
description: Design philosophy and principles of the `allometric` project.
---

Allometric models relate attributes of trees, such as diameter, height, and
crown size, to other attributes, such as biomass and volume. These models form
the basis of forest inventory systems worldwide, and many estimates and models
quantifying forest health necessarily rely on them. The number of allometric
models is vast, and they are often tucked away in obscure reports or other
resources. The allometric project is a platform for archiving and using these
models in a robust and interoperable format.

# A Design Flow for Storing Allometric Models

We specify a rigid schema for allometric models. In practice, models are written
up by users as YAML files and stored in the [`allometric/models` repository]().
Upon addition, the file is validated using the [`allometric/orc` validator](),
which checks that the model is well-formed and adheres to the schema. Models are
then compiled into a series of parquet flatfiles which are easily distributed
and ingestable into many programming languages.

This website also provides models in a human-readable format. Any publication
can be viewed by accessing the [publications page](/publications), which lists
all publications and their models currently stored in the repository.

