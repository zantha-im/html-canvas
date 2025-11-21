function createLimiter(concurrency) {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= concurrency) return;
    const job = queue.shift();
    if (!job) return;
    active++;
    Promise.resolve()
      .then(job.fn)
      .then(res => job.resolve(res))
      .catch(err => job.reject(err))
      .finally(() => {
        active--;
        runNext();
      });
  };

  const add = (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    runNext();
  });

  return { add };
}

async function mapLimit(items, limit, mapper) {
  const limiter = createLimiter(limit);
  const results = new Array(items.length);
  await Promise.all(items.map((item, idx) => limiter.add(async () => {
    results[idx] = await mapper(item, idx);
  })));
  return results;
}

module.exports = { createLimiter, mapLimit };
