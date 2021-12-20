import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | pb-stream-edit', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<PbStreamEdit />`);

    assert.dom(this.element).hasText('');

    // Template block usage:
    await render(hbs`
      <PbStreamEdit>
        template block text
      </PbStreamEdit>
    `);

    assert.dom(this.element).hasText('template block text');
  });
});
