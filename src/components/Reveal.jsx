import { motion } from 'framer-motion'

// Expo-out easing from the ui-ux-pro-max design system (cinematic, luxury feel)
const EASE = [0.16, 1, 0.3, 1]

export default function Reveal({ children, delay = 0, y = 40, className = '', as = 'div' }) {
  const MotionTag = motion[as] || motion.div
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  )
}
