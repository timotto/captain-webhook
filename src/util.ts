const pserial2 = <T,V> (a: T[], f: (x: T)=>Promise<V>): Promise<V> =>
    a.reduce((p,x) =>
        p.then(() =>
            f(x)),
        Promise.resolve(undefined));

export {pserial2}
