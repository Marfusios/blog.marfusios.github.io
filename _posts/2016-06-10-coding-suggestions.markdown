---
layout: post
title:  "Coding suggestions"
subtitle: "Just my thoughts about programming"
date:   2016-06-10 06:33:33 +0100
categories: [architecture]
---

## My suggestions

Suggestions how to keep clean, maintainable code. Based on my experience, here they are:

* **SRP** - Single Responsibility Principle - class/method should have only one reason to change. For example: if our class communicates with a server, ​​then it can't do anything else. 
* **DRY** - Don't repeat yourself - ​​no code duplications, hack all of the repetitive chunks of code out into an external function and just call it with different parameters. ​
* **Encapsulation** - Avoid public fields and public non immutable getters in the classes. With exception to DTO (data transfer objects), which are getting serialized. 
* **Consistency** - Class (and its created objects) cannot be ever in the inconsistent state. All public methods and setters (input values) must be validated (fail fast). 
* **Dependency injection** - Class must define its dependencies in the constructor. Avoid 'new' inside of the class, or calling static methods (with exception to internal stuff, which is specific just for this one class). 
* **A lot of stuff** - It is better to have more small classes and methods. Methods should be flat (only one link deep). 
* **CQS** - Command and Query Segregation - Methods should follow SRP and ideally follow CQS (only public methods in the public API). If a method returns data, it shouldn't modify anything and otherwise, if method modifies something, it shouldn't return anything.​
* **Correct naming** - Classes/methods should be named correctly (exactly what they are doing). 
* **Polymorphisms** - Only one switch in the whole application (for one chunk of related classes), which will create individual polymorphic objects. The rest of the application will be working with abstraction (interface or abstract class). 
* **Avoid static** - Try to avoid static elements (methods, classes, etc.). For example is fine to have static logger (but some internal part should be mockable - so it will be able to test). 
* **TDD** - Test Driven Development - write the unit test first and then implementation. Red-Green-Refactor. Thanks to it we understand how we want to use specified code, we find the most intuitive interface and we write testable (good) code. TDD is hard and sometimes not fully necessary, in my opinion using it 30% of development time is just fine.
* **Immutable** - Public API (methods, getters) should return only immutable types or IReadOnly collections or always valid types.
* **Postel's law** - "Be conservative in what you return, be liberal in what you accept" - never ever return null value from method in public API (library). Rather use TryParse pattern or Maybe monad or NULL pattern.
