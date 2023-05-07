# gh-generated-diff

This action checks whether uncommitted diffs are generated.

## Inputs

### `command`

**Required** The code generation command.

### `verbose`

If true, prints detailed diffs. Default is `false`.

## Example

``` yaml
uses: berquerant/gh-generated-diff@v1
with:
  command: go generate ./...
```
