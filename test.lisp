(def x 6)
(def y 5)

(def suma (lambda (a b)
            (def z 10000)
            (+ a (+ b z))))

(def result (suma x y))

(print "result: " result)

(if (not (not true))
    (print result)
    (print 1000))

(print "unkuoted" '`(progn
    (print ~greeting)
    (print ~departure)))

(defmacro greet (greeting departure)
  `(progn
    (print ~greeting)
    (print ~departure)))

(defmacro unless (pred a b)
  `(if (not ~pred) ~a ~b))

(def z 3)

(print "expansion1:" (macroexpand '(unless true
  (print "will print")
  (print "won't print"))))

(print "expansion2:" (macroexpand '(greet
 z
 :bye)))

(print "==================================================================")
(print "==================================================================")
(print "==================================================================")
(print "==================================================================")
(print "==================================================================")


(def suma (lambda (a b)
            (def z 10000)
            (+ a (+ b z))))

(def result (suma 40 20))
(print "lambdas work fine" result)

(defmacro unless (pred a b)
  `(if (not ~pred) ~a ~b))

;; @TODO cannot move definitions below and unquote it
(defmacro let (bindings & body)
  (def pairs (partition bindings 2))
  (def definitions (map #(list 'def (get % 0) (get % 1)) pairs))
  `(progn
     ~definitions
     ~@body))

(print "expansion works:" (macroexpand '(let (z 3)
               (print z))))

(let (a 10
      b 20)
  (print "let works" a)
  (print "this works too" b)) ;3

(print `hola)


(progn
  (print "hola")
  `(print "hola"))
