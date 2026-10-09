---
title: "Introduction To Mechanistic Interpretability"
description: "Why knowing what a model computes is an epistemology problem: a sealed box, a cooling fan, the Sahara, and what it takes to find the circuit rather than the correlate."
date: 2026-09-17
tags: [interpretability, epistemology, LLMs]
---

## Epistemology

Epistemology is the branch of philosophy that's concerned with the nature and limits of knowledge. What knowledge actually is, how we get it, and how we tell the difference between something that's genuinely true versus something that just looks true and happens to fool us.

But why are we talking about philosophy when the whole point is to understand what information lives inside an LLM? Or more precisely, when the goal is to figure out what information exists inside an LLM and whether the model actually uses it. Because those are two very different questions and conflating them gets you into trouble.

## The Black Box

Suppose someone hands you a box. You can't look inside it or break it open. But what you can do is feed it some numbers and get some numbers back. Your job is to figure out the internal rules by which the box operates.

Let's take a specific example.

Suppose the box accepts two numbers, $x_1$ and $x_2$, and returns either 0 or 1. After hundreds of trials you notice that whenever $x_1 + x_2 > 10$, the box almost always returns 1. So you hypothesise:

$$
y =
\begin{cases}
1 & \text{if } x_1 + x_2 > 10 \\
0 & \text{otherwise}
\end{cases}
$$

You've discovered a rule that predicts the box perfectly. But did you actually discover the rule the box itself is using? That's a harder question than it seems.

## The Gettier Problem

In 1963, the philosopher Edmund Gettier published a three page paper that basically broke the definition of knowledge. For centuries "knowledge" had meant justified true belief. You know something if you believe it, it is true, and you have good reason to believe it. Gettier showed that's not enough. All his counterexamples have the same shape: someone forms a belief for good reasons, the belief turns out to be true, and yet we don't call it knowledge. Because the reason it's true has nothing to do with the reason they believed it.

Coming back to the box. By the classical definition, you know the box's rule. Your prediction is correct almost every time, it's arguably true. But notice how easily this becomes a Gettier case. Maybe the box is checking whether $x_1$ and $x_2$ each clear some smaller threshold. Maybe it's running a lookup table. Maybe it's tracing a curve that across your observed range just happens to hug your sum-rule.

And how does this matter? After all we did predict the behaviour. We are getting the correct answers. But here's the thing. Your hypothesis is still justified, it might even be true on every data point you collected. It just wouldn't be knowledge of the box's rule, because the box was never following your rule to begin with. You got lucky. Or rather, you got a correct answer for the wrong reasons.

## The Cooling Fan Illusion

Suppose you get another box. But this time the box has a slit in it. You being curious try to peek inside and can see a gear. You feed a number and peek through the slit and watch the gear spin. You notice when you feed it a larger number the gear spins faster. You start logging gear speed against your inputs and it lines up almost too well: whenever the gear crosses some threshold, the box outputs 1.

Notice the shift here. This is not a rule about the output anymore. This is a rule about the box's internal machinery. Surely that would count as knowing something the sum-rule never could.

You think you've cracked the code. You believe: a bigger number means more work for the box, more work means the gear spins faster, and the gear spinning faster is what pushes the answer to 1. Input causes gear speed causes output. Clean. Simple. Causal.

Except that's not what the gear is.

It's a cooling fan for a smaller circuit you can't see through the slit. The part that's actually deciding 0 or 1. That circuit works harder on large numbers, runs hotter, needs more airflow, so the fan spins up whenever the input is large. You conclude that when the input crosses 10 the gear starts to speed up.

Now imagine you magically teleport to the Sahara desert where the ambient temperature is exceptionally high. The smallest computation can trigger the fan. Now you observe the fan starts up when the input crosses 3. Not 10. Three.

You can still say honestly that input and gear speed were correlated. Across all your original trials they really did move together. But look at what kind of correlation that actually was. One that only held because a background condition, ambient temperature, happened to sit still without you ever noticing it was a variable at all. The moment that condition moves the correlation frays. The gear starts firing at input 3 instead of 10. While the box's real decision doesn't shift by a single trial.

That's the tell. A cause survives you changing the conditions around it. A correlation only survives as long as those conditions hold and you don't usually find out which one you had until something around it moves.

The gear was never wired into the decision. It was riding along with something that happened to track the input, under conditions you'd quietly assumed were fixed. You watched a correlation and renamed it a cause. The desert is just what it looks like when the renaming stops working.

## The Geometry of Language

In 2013, researchers noticed something odd inside the black box called a "neural network". If you take the vector for "king" subtract the vector for "man" and add the vector for "woman" you land almost exactly on "queen".

The realisation was immediate: the network hadn't just memorised isolated vocabulary tokens. Without anyone explicitly programming the rules of language it had organised words geometrically such that semantic relationships corresponded to consistent directional shifts in space.

The direction from "man" to "woman" was roughly the same direction as "king" to "queen", "uncle" to "aunt", "actor" to "actress".

Gender wasn't a piece of metadata stored in a dictionary lookup. It was a geometric direction.

A decade later, modern Large Language Models operate on this exact geometric principle scaled up to billions of parameters and thousands of dimensions. And we still don't fully understand how they organise that space or what they actually use from it.

## Scattered Legos and the Architecture of Meaning

First let's make some things clear.

Every language model begins with a fixed vocabulary of sub-word units called tokens. So to think about this from the ground up, a language model communicates in English. Its input and output is English. So if I want to handle trillions of combinations of words and characters I obviously need some kind of reference system. Now you might think all my dataset needs is 26 characters because those are your atomic fundamental units for English. But here's the catch, our trillions of combinations aren't random combinations of characters. Language is not a random sequence of letters, it's governed by syntax, grammar and context, where the meaning of a word shifts depending on its surrounding tokens.

So before training begins an algorithm like Byte Pair Encoding builds the token vocabulary by identifying the most statistically frequent character sequences. Its job is to optimise for compression and frequency statistics. Nothing semantic. Nothing meaningful yet. Just statistics.

Once tokenised, massive volumes of curated text are fed into the model during pre-training. So now what you have is this huge collection of fundamental tokens. Imagine them lying on the ground like a bunch of Legos, scattered, disconnected, meaningless. What we want to do is insert some kind of meaning, context, relationship and idea behind every token. We do this by mapping each token into a point in an internal high-dimensional vector space. An embedding matrix.

Now diving into the transformer architecture, and I'm going to describe this extremely broadly. There are two components to the original transformer: an encoder and a decoder. One important thing to hold in your head: the embedding matrix is static. Its weights don't change during inference.

Take the sentence "Marie cleans the room". Assume the fundamental tokens are `{'Marie', 'cleans', 'the', 'room'}`. Our embedding matrix has a numerical vector assigned to each of those tokens. These embeddings are fed into the encoder. The encoder uses attention and MLPs (which we'll get to) to produce new richer embeddings. Those are handed to the decoder. The decoder converts them back into text. And that's how a transformer generates language from a given input, at the highest level.

Now let's look at what actually happens inside the encoder. Because this is where the box gets its slit.

## The Conveyor Belt: Attention and Private Thought

The encoder isn't one thing. It's a stack of identical layers, dozens sometimes over a hundred in modern models. Each layer does two operations in sequence: self-attention, followed by a multi-layer perceptron (MLP). And between every layer there's a residual stream, a running vector that accumulates information as it passes through the network.

Think of the residual stream as a conveyor belt. It starts with your raw token embeddings. Each layer reaches onto the belt, modifies what's there, and puts it back. By the time the belt reaches the decoder it's been touched and reshaped by every layer in sequence.

Self-attention is how tokens talk to each other. The sentence "Marie cleans the room" is not four isolated words. "Cleans" needs to know who is doing the cleaning. "The room" needs to know what is being cleaned. Attention lets each token look at every other token in the sequence and decide: how much of your information do I need to update myself? It computes a weighted average, pulling relevant information from other positions and blending it into the current token's representation.

After attention has let the tokens gossip among themselves, the MLP acts on each token independently. It's a small neural network, two or three matrix multiplications with a non-linearity sandwiched in, applied to every position separately. If attention is communication between tokens, the MLP is private thought. It's where the model does the heavy lifting of transforming information. Composing features, applying learned functions, routing signals into new directions in the vector space.

And then the layer writes its result back onto the residual stream. The next layer reads from the stream, does its own attention, its own MLP, writes back. Layer after layer. The representation of "Marie" that enters layer 1 is not the representation of "Marie" that exits layer 48. She has been contextualised. She now carries information about cleaning, about rooms, about grammar, about the statistical neighbourhood of every sentence she appeared in during training.

## The Probing Trap

Now notice where we are.

We started with a sealed box. Input goes in, output comes out, and all you can do is guess the rule from the outside. That was the sum-rule. That was predicting $x_1 + x_2 > 10$ without ever seeing the mechanism.

Then someone cut a slit in the box. You could see a gear. You could correlate the gear's speed with the input. You felt like you understood how the box worked, not just what it did.

The residual stream is the slit.

In a transformer we can actually look at the intermediate representations. We can pull out the vector at layer 12, token position 3, and ask: what does this direction encode? We can probe it. We can train a tiny linear classifier on top of it and check whether it can predict whether the token refers to a person, a place, a tense, a sentiment. This is the entire subfield of probing in interpretability research. And for a while it felt like we'd cracked it. We found directions for gender, for number, for syntactic role. We found neurons that seemed to fire on specific concepts. We published papers. We drew diagrams.

But remember the gear.

## The Sahara Shift: When Correlations Fray

Here's the problem. A modern LLM has, say, 4096 dimensions in its residual stream. But the number of features the model needs to represent, every concept, every grammatical rule, every factual association, every contextual nuance, is vastly larger than 4096. We're talking about millions of features crammed into a space with only thousands of axes.

So the model does something clever and from our perspective deeply inconvenient. It represents features in superposition. It doesn't assign one clean axis to one clean concept. It packs features into directions that are almost orthogonal but not quite. Overlapping, interfering, sharing the same geometric real estate. The model has learned to live with a small amount of noise on each feature in exchange for representing far more features than the dimensionality should allow.

This is the Sahara.

You trained your probe at a comfortable ambient temperature. On one distribution, one task, one way of prompting the model. And the gear correlated beautifully. The direction you found did encode gender. Did encode tense. Did encode the capital of France. But you change the temperature, you prompt the model differently, you shift the context, you ask the question in a different language, you add an adversarial suffix, and suddenly the feature activates at a different threshold. Or activates when it shouldn't. Or doesn't activate when it should.

The direction you found was real but it was a cooling fan. It was correlated with the computation under the conditions you happened to test and it frayed the moment those conditions moved.

The model was never using your neat one-dimensional axis. It was using a superposed entangled high-dimensional pattern that your linear probe could only approximate under specific conditions. You watched a correlation and renamed it a mechanism.

## Mechanistic Interpretability: Stopping the Gear

So what do we do? We stop watching the gear from the outside. We reach in.

Mechanistic interpretability is the attempt to go beyond probing, beyond correlating directions in activation space with human-interpretable concepts, and instead identify the actual circuits the model uses to compute a specific behaviour. Not "this direction is correlated with gender". Instead: "these specific attention heads in this specific layer read from these specific token positions, and their output is written into the residual stream, and the MLP in the next layer reads that signal and gates it against another signal, and the final logit difference is produced by this particular linear combination in the unembedding matrix."

The methodology is causal not correlational. And this is the critical distinction, the one that separates the gear from the actual circuit.

You perform interventions. You don't just observe that attention head 6.9 lights up on the word "Marie". You ablate it. You zero it out. You replace its output with noise or with the output from a different input, and you ask: does the model's behaviour change? If you knock out the component and the model still gets the answer right, that component was the cooling fan. It was correlated. It was riding along. But it was not in the circuit.

You also perform activation patching: run the model on a clean input and a corrupted input, swap the activations at a specific layer and position from one run into the other, and measure whether the output shifts. If it does you've found a component that is causally responsible for the behaviour in question. Not correlated. Responsible.

A cause survives you changing the conditions around it. You are changing the conditions. You are reaching into the box, grabbing the gear, stopping it, and seeing whether the output changes.

## Anatomy of a Circuit

When you do this carefully what you find are circuits: small composable subgraphs of attention heads and MLP layers that implement a specific computation. The induction circuit for instance is a well-studied mechanism by which transformers copy patterns. If the model has seen "A B ... A" in context, a specific pair of attention heads, one in an earlier layer one later, collaborate to predict "B" at the final position. You can ablate either head and the copying behaviour collapses. You can patch in their activations from a run where the pattern exists and restore it.

The circuit is not a metaphor. It's a causal claim: these components in this arrangement produce this behaviour and removing any of them breaks it.

This is what it looks like to actually know the box's rule. Not to predict the output. Not to correlate an internal signal with an input. But to identify the gears that are wired into the decision, to trace the signal path, to show that the computation flows through the components you identified and not around them.

## The Lingering Shadow of Gettier

But. And this is where the philosophy bites again. Even here in the causal machinery the Gettier shadow lingers.

You find a circuit. You ablate it. The behaviour breaks. You conclude: this is how the model does this task. But consider, the model is a massive redundant superposed system. There may be another circuit overlapping with yours, sharing half its components, that also implements the behaviour under slightly different conditions. You found a sufficient mechanism. Maybe not the mechanism. Maybe not the one the model prefers in deployment.

Your causal intervention was clean, your evidence was strong, your belief was justified and true. But the reason the model produces the answer in production might be subtly structurally different from the circuit you isolated. The same way the sum-rule predicted the box perfectly without being the box's rule.

And superposition makes this worse. When features overlap in the same subspace, ablating a "feature direction" doesn't cleanly remove one concept. It perturbs a dozen entangled features simultaneously. Your intervention is not surgical. You are not removing one gear. You are pulling on a thread that's woven into the fabric of several gears at once and you cannot be entirely sure which gear's absence caused the output to change.

This is the honest state of the field. We have better tools than correlation. We have causal interventions, circuit discovery, sparse autoencoders that attempt to decompose superposed representations into more interpretable pieces. We are no longer just watching the gear from the slit. But we are not yet watching the actual circuit in full clarity. We are somewhere between the sealed box and perfect transparency, and the epistemology matters because it keeps us honest about which kind of knowledge we have at each step.

## A Taxonomy of Machine Knowledge

Let's return to the taxonomy.

Prediction is the sum-rule. You can predict the output without knowing the mechanism. Benchmarks do this. Perplexity scores do this. This is not nothing, but it is not understanding.

Correlation is the gear. You peek through the slit. You find a direction, a neuron, an activation pattern that tracks some concept. Probing does this. Most early interpretability work does this. It's more than prediction but it's not yet causal knowledge. It's vulnerable to the Sahara.

Causal mechanism is the circuit. You intervene. You ablate. You patch. You show the signal flows through specific components and that removing them breaks the behaviour. Mechanistic interpretability aspires to this. It's the strongest claim we can make from outside the box. But even it carries Gettier risk because the model's true computation may be distributed, redundant, and superposed in ways your intervention only partially isolates.

And above all of this sits the question we started with. Does the model use the information we find? Is the feature we identified something the model computed and relied upon, or is it a byproduct, a cooling fan, of a computation that looks similar from the outside? The only way to answer that is causal intervention. The only way to know the gear is not a fan is to stop it and see if the box still decides.

## Closing the Box: The Discipline of Honesty

We started with epistemology because mechanistic interpretability is at its core an epistemological project. It's the attempt to move from *the model gets the right answer* to *the model gets the right answer for this reason, through these components, in this sequence, and if you remove any of them it stops.* Every step of that journey is a step away from Gettier cases. Away from justified true beliefs that are true by accident. Away from gears that spin but don't decide.

The box is still mostly sealed. The slit is narrow. The ambient temperature keeps shifting. But we are no longer content to log inputs and outputs and call the sum-rule knowledge. We want to see the gears. We want to touch them. We want to stop one and watch the output change.

And we want to be honest at every step about whether what we're seeing is the mechanism or just the fan.

That honesty is what epistemology gives us. Not the answer. The discipline to know whether we have one.
