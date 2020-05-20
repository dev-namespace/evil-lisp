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

(.log console "this works!")
