(print "[*] File read working")

(def suma (lambda (a b)
            (+ 0 0)
            (+ 1 2)))

(print "[*] Lambdas working: 1 + 2 = " (suma 1 2))

(def fib (lambda (n)
           (if (< n 2)
               n
               (+ (fib (- n 1)) (fib (- n 2))))))

;; (print (fib 10))

(print "prognres" (progn
  (print "1")
  (print "1")
  (print (list (list 1 2) 3))
  100))

(print '(1 2 3))


(defmacro unless (pred a b)
  `(if (not ~pred) ~a ~b))

(defmacro let (bindings & body)
  (def pairs (partition bindings 2))
  (def definitions (map #(list 'def (get % 0) (get % 1)) pairs))
  `(progn
     ~@definitions
     ~@body))

;; (print (macroexpand '(unless true (print "hola") (print "adios"))))

;; (print "expansion works:" (macroexpand '(let (z 3)
;;                (print z))))

(print (macroexpand '(let (a 10
      b 20)
  (print "let works" a)
  (print "this works too" b))))

(let (a 10
      b 20)
  (print "let works" a)
  (print "for multiple parameters" b)) ;3

(unless false (print "unless works"))
