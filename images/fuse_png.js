/* eslint-disable */
import SimLauncher from '../../joist/js/SimLauncher.js';
const image = new Image();
const unlock = SimLauncher.createLock( image );
image.onload = unlock;
image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANkAAABDCAYAAAARQ6BTAAAACXBIWXMAABcSAAAXEgFnn9JSAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAABMVJREFUeNrsm99PU2cYx982bcFgskJIOkw7zqwXrnhRlk2TzY7qkg2SxXGz6c22qn+A9C8gu3dBE7Pb+R8A00ycMJvsp7uC/Yi7sLOEBtyF40fiQgs97D1Q6pEdcclWeN7y+SRvTlPAnPI8Xz7P+7YqBQB1xbfdF+OdVlhfMnr16GXplRT4GnL56cIJStl46P5L68ttobeX06ug16juv5HtvjGwTbgGnguHL8Tj8XD80CEVjUVFvtKhi5/QjQ1MNBZT751+X9x9lUqldHFmRuXv5TPVsGWfFraAR8AcWw0fT6Ws11LHqTLsKn6fTwVDIXH35dzT4URifaV63rAmxseH9dNXq2FbeGrInIA179t3+4OPPgxHIhEqDLu/n/H7VSgYFH2P7e3t6vSZM+rHO3cyX47ddCTV7Rmy6og4fPb8ufDzHR1UF2SETKjJvHg9lVIrKytJNfHVkLZZ1stkg++cOmW90NlJZUHOuOj3qZAhIXN4q7dXTRemB9TGgUiuFjJtMautrW3gxEkO6UCayeSPi1vp7etTn165Mqg2TiBrJutPv3nSGC3D3jKZaX15OPGSikajaf3Q0jYrbIbs3UQiYZSWYQ+ZzMC+TL7crYrFYr9+eGkzZMkXDx6koiAwZNpkho2LDomuLnX982th97gYxmIgc1w002SBwPofhh53yBgVQazJTOzNYPDxwX3tEYceINNkPiN7MxDwCFnIwLkX9oLJ/Eb2pnfIMBlIDJnfzHEx4PrDwLgIssdFbbLGGRcJGYgcFw01mVfIguzJQKLJ/H4jezMYCGIywGQ7bjLnxQDIS5mZvekc2NRsTBUB6jzy8isAIGQAhAwACBkAIQMgZABAyAAkUnsz2rZtfhsgjzUze9N9z7WQVSoVCgryMra2ZmRv2hVCBoSsrlTsyj9Dtrq6SkVBZMhM7E1MBgZtyRrIZBVMBjJVZmRv2hWvcRGTgcyMGdmbFc/TRUwGQvdkmAygziEz0mQcfIBRJuPgA4BxkXERzA2ZWuPgA6DOKsNkAHXOGCYDYE/2L03G6SKIDVmjHOHzAWGQGjIjPyBsYzLAZHU2GSEDc2Jm5n/atBkXgXERkwFshExhMgBMhsnA8JA1zBE+b0aD2JA1yhE+H6sCseNiwxzhYzKQGTNDTWZjMsBkO2CyBXfICvpJi5KCvJCZeSg3Pz/vXKbcIZss3L9vxWIxqgriTGbiuPjHgwfruXKHbPTXn3/p7zhwgKoC4+L/wO/38s6omKuFLD9duNrc3Dz416NHVlNTE5UFTPYf+O3uXbW4uDiic/XEnkwtLy9/PHFr/LO3+3qpLIjalJm0JyuVSurbr79xwpXdfK4WMsdm+tIzNTmZ6TpyhOKCjIwpcz5WVS6X1RfXrjtBy25a7ImQVcn+8N33yaWlpeTRY8eoMMgYFw0wWblUVmM3bqg/Hz48WxWW8gxZNX3deg3Nzc4NvHL0VRWJRKg07Oa0KN5kzh7sp8mpBW0yJ2AjW78e8Poh/Y3ZuFKjt8ZuXmjZv78/Gouq1tZW1dLSQtVhhw1RUnOzs+Luy3kfbEGv4kzRCddl/dQl94joxvesfyzeaYX1Ja1XUmgdClv1DI2B7j1LXzKCbzGney9HpQB2mb8FGACL11kywtsrYAAAAABJRU5ErkJggg==';
export default image;