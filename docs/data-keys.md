# Data Keys and Special Characters

In order to reference values collected in the experiment context we will use a `$$path.to.dataKey` notation. This means that if we have a data key called `age` that is being collected in the experiment, we can reference it in the condition config of a branch node as `$$age`. It supports the dot notation to reference nested data, so if we have a data key called `demographics` that is an object with an `age` property, we can reference it as `$$demographics.age`.

In order to reference values from the current loop we use the `@` notation to access to data inside the `currentItem` object in the context. So if we want to access the value of the current iteration we can use `@value`, if we want to access the index of the current iteration we can use `@index`, and if we want to access the loopId of the current loop we can use `@loopId`.

We will also be using `$` (a single dollar sign) to reference values from the current screen. This is usefull to be able to use values from the current screen to show or hide another component in the same screen based on the interaction of the participant with the first component. For example if we ask a participant if they have children (with a yes/no boolean component) whe may use that `$hasChildren` value to show a new component asking how many children do they have only if the answer to the first question is yes.

## Summary

| Prefix | Scope                  | Example                  |
| ------ | ---------------------- | ------------------------ |
| `$$`   | Experiment-wide data   | `$$demographics.age`     |
| `@`    | Current loop iteration | `@value`, `@index`       |
| `$`    | Current screen         | `$hasChildren`           |
