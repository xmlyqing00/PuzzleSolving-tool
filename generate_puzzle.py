import argparse

from src.generator import PuzzleGenerator

def generate_puzzle(args):
    
    print('Groundtruth img path:', args.img_path)
    print('Piece num: %d, sample num: %d\n' % (args.piece_n, args.sample_n))
    print('Background color:', args.bg_color)

    generator = PuzzleGenerator(args.img_path)

    for i in range(args.sample_n):
        
        print('Sample:', i)

        generator.run(args.piece_n, args.offset_h, args.offset_w, args.small_region, args.rotate)
        generator.save(args.bg_color)

if __name__ == '__main__':

    # Hyper parameters
    parser = argparse.ArgumentParser(description='A tool for generating puzzles.')
    parser.add_argument('-i', '--img-path', default=None, type=str, required=True,
        help='Path to the input image.')
    parser.add_argument('-n', '--piece-n', default=100, type=int,
        help='Number of puzzle pieces. Default is 100. The actual number of puzzle pieces may be different.')
    parser.add_argument(
        '-t', '--sample-n', default=1, type=int,
        help='Number of puzzle you want to generate from the input image. Default is 1.')
    parser.add_argument('--offset-h', default=1, type=float,
        help='Provide the horizontal offset rate when chopping the image. Default is 1. \
        The offset is the rate of the initial rigid piece height. If the value is less than \
        0.5, no interaction will happen.')
    parser.add_argument('--offset-w', default=1, type=float,
        help='Provide the vertical offset rate when chopping the image. Default is 1. \
        The offset is the rate of the initial piece width. If the value is less than \
        0.5, no interaction will happen.')
    parser.add_argument('-s', '--small-region', default=0.25, type=float,
        help='A threshold controls the minimum area of a region with respect to initial rigid \
        piece area. Default is 0.25.')
    parser.add_argument('-r', '--rotate', default=180, type=float,
        help='A range of random rotation (in degree) applied on puzzle pieces. Default is 180. \
        The value should be in [0, 180]. Each piece randomly select a rotation degree in [-r, r]')
    parser.add_argument('--bg_color', default=[0, 0, 0], type=int, nargs=3,
        help='Background color to fill the empty area. Default is [0, 0, 0]. The type is three uint8 \
        numbers in BGR OpenCV format.')
    args = parser.parse_args()

    args.bg_color = tuple(args.bg_color)

    generate_puzzle(args)
