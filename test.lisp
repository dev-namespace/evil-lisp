(def x 6)
(def y 5)

(def suma (lambda (a b)
            (def z 10000)
            (+ a (+ b z))))

(def result (suma x y))

(print "result: ")

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

(greet
 :hello
 :bye)

(def x 2)
(print `(print 1 ~x))

(defmacro unless (pred a b)
  `(if (not ~pred) ~a ~b))

(unless true
  (print "will print")
  (print "won't print"))
