starting(a). starting(b). starting(c). starting(d). starting(e). starting(f).
edge(a,b, blue). edge(a,c, blue). edge(b,c, blue). edge(b,d, blue). edge(c,d,
blue). edge(c,e, blue). edge(d,e, blue). edge(d,f, blue). edge(e,f, blue).
node(X, red) | node(X, yellow) | node(X, green) :- starting(X). :-
node(X,C),node(Y,C), edge(X,Y,_),X!=Y.
