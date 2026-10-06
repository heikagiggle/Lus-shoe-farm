import Link from 'next/link';
import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp} from 'react-icons/fa';

const cols = [
  { title: 'Lus Shoe Farm', links: [['About Us', '#about-us'], ['Careers', '/career'], ['Best Sellers', '/collections/best-sellers'], ['Mature Woman', '/collections/mature-woman']] },
  { title: 'Shop', links: [['All shoes', '/shop'], ['New Arrivals', '/new-arrivals'], ['Best Sellers', '/collections/best-sellers'], ['Mature Woman', '/collections/mature-woman']] },
  { title: 'Categories', links: [['Flats', '/shop?category=Flats'], ['Sandals', '/shop?category=Sandals'], ['Heels', '/shop?category=Heels'], ['Boots', '/shop?category=Boots'], ['Slippers', '/shop?category=Slippers']]},

  { title: 'Help', links: [['Refund & Cancellation Policy', '/policies/refund-policy'], ['Privacy Policy', '/policies/privacy-policy'], ['Data Retention Policy', '/policies/data-retention-policy'], ['Terms of Service', '/policies/terms-of-service']] },
];
export function Footer() {
  return (
    <footer className="mt-16 border-t bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">

        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 font-semibold uppercase">{c.title}</p>

            <ul className="space-y-2 text-sm">
              {c.links.map(([l, h]) => (
                <li key={h}>
                  <Link
                    href={h}
                    className="hover:text-brand hover:underline"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Connect with us */}
        <div>
          <p className="mb-3 font-semibold uppercase">
            Connect with us
          </p>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            <a
              href="https://instagram.com/YOUR_USERNAME"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              <FaInstagram size={18} />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              <FaFacebookF size={17} />
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              <FaTiktok size={17} />
            </a>

            <a
              href="https://wa.me/2349020307231"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition hover:border-brand hover:bg-brand hover:text-white"
            >
              <FaWhatsapp size={19} />
            </a>
          </div>

          {/* Email */}
          <a
            href="mailto:giggleoftheamazon@gmail.com"
            className="mt-4 block text-sm text-brand hover:underline"
          >
            giggleoftheamazon@gmail.com
          </a>

          {/* Marketing text */}
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Follow us for exclusive offers, new arrivals, special
            drops, and all the latest from Lu&apos;s Shoe Farm.
          </p>
        </div>
      </div>

      <p className="border-t py-4 text-center text-xs text-neutral-600">
        © {new Date().getFullYear()} Lu&apos;s Shoe Farm. All rights reserved.
      </p>
    </footer>
  );
}
