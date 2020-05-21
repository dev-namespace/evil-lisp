;; (def x 6)
;; (def y 5)

;; (def suma (lambda (a b)
;;             (def z 10000)
;;             (+ a (+ b z))))

;; (def result (suma x y))

;; (print "result: " result)

;; (if (not (not true))
;;     (print result)
;;     (print 1000))

;; (print "unkuoted" '`(progn
;;     (print ~greeting)
;;     (print ~departure)))

;; (defmacro greet (greeting departure)
;;   `(progn
;;     (print ~greeting)
;;     (print ~departure)))

;; (defmacro unless (pred a b)
;;   `(if (not ~pred) ~a ~b))

;; (def z 3)

;; (print "expansion1:" (macroexpand '(unless true
;;   (print "will print")
;;   (print "won't print"))))

;; (print "expansion2:" (macroexpand '(greet
;;  z
;;  :bye)))

;; (print "==================================================================")
;; (print "==================================================================")
;; (print "==================================================================")
;; (print "==================================================================")
;; (print "==================================================================")

(print "suma" (+ 1 2))

(def ink (lambda (& args)
     (map inc args)))

(print "ink result:" (ink 0 0 2 3))
