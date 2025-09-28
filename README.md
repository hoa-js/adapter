## @hoajs/adapter

Adapters for Hoa.

## Installation

```bash
$ npm i @hoajs/adapter --save
```

## Quick Start

```js
import { Hoa } from 'hoa'
import { nodeServer } from '@hoajs/adapter'

const app = new Hoa()
app.extend(nodeServer())

app.use(async (ctx, next) => {
  ctx.res.body = `Hello, Hoa!`
})

app.listen(3000)
```

## Documentation

The documentation is available on [hoa-js.com](https://hoa-js.com/adapter/node.html)

## Test (100% coverage)

```sh
$ npm test
```

## License

MIT
