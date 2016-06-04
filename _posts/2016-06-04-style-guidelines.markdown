---
layout: post
title:  "Style guidelines"
subtitle: "Coding style guidelines in C#"
date:   2016-06-04 19:20:33 +0100
categories: [dotnet]
---

## Importance of style guidelines

Defining and following the coding style guidelines is not just nice to have, but it is very very important. 
It doesn't matter whatever guidelines you choose, but it is crucial to choose something. 
Why? Because it leads to cleaner, readable and maintainable source code. 
And maintaining code is a part of development, not just something in the future.

## My preferred style guidelines

Here are guidelines which I always use (when it is possible). 
Most of these guidelines are blessed by creators of C# language, but I did some meaningful changes. 

### Naming guidelines

1. `Private members` - **_lowerCame​lCase​​** (with prefix _) and use readonly where possible. 
2. `Local variables` and `method parameters` - **lowerCamelCase**
3. `Private methods`, `properties` and `events` - **lowerCamelCase​** 
4. `Non private methods`, `properties`, `fields`​ and `events` - **UpperCamelCase**
5. `Constants`, `static readonly fields` - **ALL_UPPER**
6. `Interfaces` - **IUpperCamelCase** 
7. `Types` and `namespaces` - **UpperCamelCase**
8. `Generic types` - **TUpperCamelCase**
9. Avoid **this**. unless absolutely necessary.​ 
10. Always specify the​ **visibility** (private string _f​oo) 
11. Use **Allman style braces**, where each brace begins on a new line. A single line statement block can go without braces but the block must be properly indented on its own line and it must not be nested in other statement blocks that use braces

### Coding guidelines

* Include unit tests when adding new features. When fixing bugs, start with adding a test that highlights how the current behavior is broken. 

### Order of items in classes​

1. Constant Fields​
2. Fields
3. Constructors
4. Finalizers (Destructors)
5. Properties​
6. Public methods
7. Private methods
8. Events
9. Implementation of interfaces (each in own region)