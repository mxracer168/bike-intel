import { Icon } from '@/ui/Icon'
import type { CatalogImage } from './types'
import styles from './Catalog.module.css'

/**
 * A product's image on a light ground, or a quiet placeholder. Only an image
 * confidently matched to this exact product is ever shown (docs/catalog.md);
 * a wrong product is worse than none. The placeholder is decorative: the
 * product's name is always beside it.
 */
export function ProductImage({ image, size }: { image: CatalogImage | null; size: 'row' | 'card' | 'hero' }) {
  return (
    <span className={`${styles.image} ${styles[`image_${size}`]}`}>
      {image
        // eslint-disable-next-line @next/next/no-img-element -- supplier and manufacturer images come from many hosts
        ? <img src={image.src} alt={image.alt} loading="lazy" />
        : <span className={styles.imageNone} aria-hidden="true"><Icon name="image" size={size === 'row' ? 18 : size === 'card' ? 24 : 32} /></span>}
    </span>
  )
}
