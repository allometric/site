---
title: Contributing Models
---

Models enter the allometric ecosystem as publication YAML files. These files are
added to the [`models`](https://github.com/allometric/models) repository, which
is the canonical source of allometric models. Each file describes one
publication and the models reported in it. Files are validated against a strict
schema by [`orc`](https://github.com/allometric/orc), but this validation is
done automatically after a [pull request is opened](#submitting-a-pull-request),
so the user need not worry about running the validator themselves. The schema is
designed to be simple and human-readable, but large language models are
excellent tools for assisting in writing publication files, and we encourage
their use here.

## Submitting a Pull Request

All models are stored in the
[`models`](https://github.com/allometric/models) repository. To contribute,
fork the repository, add your publication file, and open a pull request.

1. **Fork and clone** the repository, and create a branch for your work.
2. **Add your file** — one publication per YAML file, placed under
   `publications/` in the folder matching its first author (`a_e`, `f_j`, `k_o`,
   `p_t`, or `u_z`).
3. **Commit with a conventional message**: `feat: add doe_2024` for a new
   publication, `fix:` for edits to an existing one. Releases are automated from
   these messages.
4. **Open the pull request** CI ingests the entire data and rebuilds the
   compiled storage artifacts; a passing run means your file is well-formed and
   ready for review.

The rest of this guide covers how the YAMLs are written.

## File Structure

A publication file has two parts: a `publication` block with bibliographic
metadata, and at least one of `models` or `model_sets` describing the models,
the former is used to list individual models one-by-one, and the latter is used
to list a set of models that share the same equation form but have different
parameters. The following example shows a publication with one model:

```yaml
publication:
  key: doe_2024
  bibtype: article
  title: "Growth and yield of a mixed conifer stand"
  author: "Doe, Jane"
  year: 2024

models:
  - name: hstix50
    type: fixed_effects
    response: { hstix50: "ft" }
    covariates: { atb: "year", hst: "ft" }
    prediction_function: "4.5 + a * exp((b - c * log(atb)) * (hst - 4.5))"
    parameters: { a: 22.6, b: 0.014482, c: 0.001162 }
```

## Publication Metadata

The `publication` block identifies the source. Only five fields are required;
everything else is standard optional bibliography.

| Field     | Type    | Notes                              |
|-----------|---------|------------------------------------|
| `key`     | string  | unique citation key, `author_year` |
| `bibtype` | string  | standard BibTeX type               |
| `title`   | string  | the title of the publication       |
| `author`  | string  | the authors, see examples for formatting |
| `year`    | integer | the publication year               |

`bibtype` is one of the standard BibTeX types: `article`, `book`, `booklet`,
`inbook`, `incollection`, `inproceedings`, `manual`, `mastersthesis`, `misc`,
`phdthesis`, `proceedings`, `techreport`, `unpublished`. Optional fields such
as `journal`, `volume`, `pages`, `doi`, `url`, `institution`, `number`, and
`publisher` are accepted as-is. A free-form `descriptors` map can carry extra
metadata, e.g. the country and region a study covers:

```yaml
publication:
  key: hahn_1991
  bibtype: article
  title: "Stem volume equations for forest trees in the north central region"
  author: "Hahn, Jerold T."
  year: 1991
  descriptors:
    country: US
    region: [US-MN, US-WI, US-MI]
```

## Models

Use `models` for one or a few individual equations. Every model needs a name, a
type (`fixed_effects` is the only supported type), a `response` with units, and
a `prediction_function` relating the response to the `covariates`, with numeric
`parameters`.

| Field                 | Type                   | Notes                          |
|-----------------------|------------------------|--------------------------------|
| `name`                | string                 | unique within the file         |
| `type`                | `fixed_effects`        |                                |
| `response`            | map                    | `{name: units}`                |
| `covariates`          | map                    | `{name: units-or-kind}`        |
| `parameters`          | map of name to number  | `{name: value}`                |
| `prediction_function` | string                 | equation using parameter names |
| `taxa`                | list of `taxon`        | species the model applies to   |
| `description`         | string                 | e.g. "Table 1, eq. 2"          |

```yaml
models:
  - name: hstix50
    type: fixed_effects
    response: { hstix50: "ft" }
    covariates: { atb: "year", hst: "ft" }
    taxa:
      - family: Pinaceae
        genus: Tsuga
        species: heterophylla
    parameters: { a: 22.6, b: 0.014482, c: 0.001162 }
    prediction_function: "4.5 + a * exp((b - c * log(atb)) * (hst - 4.5))"
```

`prediction_function` is plain math syntax: `*`, `/`, `+`, `-`, `^` for
powers, and functions like `log()` and `exp()`. Parameter names in the
equation must match the `parameters` map exactly.

## Model Sets

When a paper reports several parameterizations of the same equation form —
often one per species — use `model_sets`. The set shares a single
`prediction_function`, `response`, and `covariates`; each `specifications`
row holds one `parameters` combination and the scope it applies to.

```yaml
model_sets:
  - name: cuvol
    type: fixed_effects_set
    response: { cuvol: "ft3" }
    covariates: { dsob: "in" }
    prediction_function: "b_1 + b_2 * dsob^2"
    specifications:
      - parameters: { b_1: 122.77, b_2: 0.4148 }
        taxa: [{ genus: Pinus, species: resinosa }]
      - parameters: { b_1: 0.25, b_2: 1.3 }
        taxa: [{ genus: Acer, species: saccharum }]
```

Every row must use the **same parameter keys** (this is validated); parameter
names are derived from the rows, not declared separately. Each row may carry
its own `taxa`, `region`, `component`, or `descriptors` scope.

## Taxon

A `taxon` names any non-empty subset of `family`, `genus`, `species`:

```yaml
taxa:
  - genus: Quercus
    species: alba
  - family: Pinaceae
```

## Response and Covariates

`response` and `covariates` accept the compact `{name: value}` form shown
above, or the object form `{ name: hstix50, units: ft }`. Covariate values
that are not physical units — like `{ atb: "year" }` — are preserved as
kind/definition labels; use `covt_defs` to spell out the definition if needed.
